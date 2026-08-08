/**
 * Payment Driver — ارز دیجیتال (Crypto)
 *
 * این درایور آدرس کیف پول را برای پرداخت نمایش می‌دهد.
 * تأیید تراکنش نیاز به بررسی بلاک‌چین (Blockchain API) دارد.
 *
 * پشتیبانی: USDT (TRC20/ERC20), BTC, ETH, DOGE, LTC
 */

import type { PaymentDriver, PaymentResult, VerifyResult, PaymentMetadata } from './BaseDriver';

interface CryptoWallet {
  currency: string;
  address: string;
  network?: string;
}

export class CryptoDriver implements PaymentDriver {
  private wallets: CryptoWallet[];

  constructor(wallets: CryptoWallet[]) {
    this.wallets = wallets;
  }

  async createPayment(amount: number, metadata: PaymentMetadata): Promise<PaymentResult> {
    // انتخاب اولین کیف پول فعال
    const wallet = this.wallets[0];

    if (!wallet || !wallet.address) {
      throw new Error('هیچ کیف پول ارز دیجیتالی تنظیم نشده است.');
    }

    // لینک پرداخت — ترکیبی از آدرس و مقدار (برای اپ‌های کیف پول)
    let paymentUrl = '';
    const currency = (wallet.currency || 'USDT').toLowerCase();

    if (currency === 'usdt' && wallet.network?.toUpperCase() === 'TRC20') {
      paymentUrl = `https://www.tronlink.org/#/send?address=${wallet.address}&amount=${amount}`;
    } else if (currency === 'btc') {
      paymentUrl = `bitcoin:${wallet.address}?amount=${(amount / 1e8).toFixed(8)}`;
    } else if (currency === 'eth') {
      paymentUrl = `ethereum:${wallet.address}?value=${amount}`;
    } else {
      // آدرس خالی — کاربر باید دستی انتقال دهد
      paymentUrl = '';
    }

    return {
      paymentUrl,
      transactionId: `crypto_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      gateway: 'crypto',
    };
  }

  async verifyPayment(transactionId: string): Promise<VerifyResult> {
    // ─── بررسی تراکنش در بلاک‌چین ───
    //
    // نیاز به API خارجی مانند:
    // - TronGrid API برای USDT (TRC20)
    // - Blockchain.com API برای BTC
    // - Etherscan API برای ETH/USDT (ERC20)
    //
    // نمونه (TronGrid):
    // const response = await fetch(`https://api.trongrid.io/v1/accounts/${walletAddress}/transactions`);
    // const data = await response.json();
    // const matchingTx = data.data?.find(tx => tx.txID === transactionId);

    // نمونه اولیه — همیشه در حالت pending
    return {
      status: 'pending',
      refId: transactionId,
      data: {
        message: 'بررسی تراکنش بلاک‌چین نیاز به API خارجی دارد',
        note: 'این درایور به‌صورت خودکار تأیید نمی‌کند — تأیید دستی توسط مدیر انجام شود.',
      },
    };
  }

  /** دریافت لیست کیف پول‌ها */
  getWallets(): CryptoWallet[] {
    return [...this.wallets];
  }

  /** دریافت کیف پول بر اساس ارز */
  getWalletByCurrency(currency: string): CryptoWallet | undefined {
    return this.wallets.find(w => w.currency.toUpperCase() === currency.toUpperCase());
  }
}

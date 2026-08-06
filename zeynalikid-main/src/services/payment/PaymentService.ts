/**
 * Payment Service — لایه انتزاعی اصلی (Multi-Gateway Factory)
 *
 * این سرویس چندین درایور پرداخت را همزمان مدیریت می‌کند.
 * هر درگاه فعال یک درایور مستقل دارد و می‌توان پرداخت را
 * با شناسه درگاه مشخص انجام داد.
 *
 * ساختار جدید تنظیمات:
 *   paymentConfig: {
 *     gateways: [{ id, label, enabled, config }],
 *     defaultCurrency,
 *     callbackUrl,
 *   }
 */

import {
  PaymentDriver,
  PaymentResult,
  VerifyResult,
  PaymentMetadata,
  ZarinpalDriver,
  IDPayDriver,
  PayPingDriver,
  BlubankDriver,
  StripeDriver,
  PayPalDriver,
  CryptoDriver,
} from './drivers';

// ─── پیکربندی هر درگاه ───
export interface GatewayConfig {
  /** شناسه درگاه: blubank, zarinpal, idpay, payping, stripe, paypal, crypto */
  id: string;
  /** نام نمایشی */
  label: string;
  /** آیا این درگاه فعال است؟ */
  enabled: boolean;
  /** تنظیمات اختصاصی هر درگاه */
  config: Record<string, any>;
}

// ─── پیکربندی کل سیستم پرداخت ───
export interface PaymentConfig {
  /** لیست درگاه‌ها */
  gateways: GatewayConfig[];
  /** ارز پیش‌فرض (IRR, IRT, USD, ...) */
  defaultCurrency?: string;
  /** آدرس بازگشت پس از پرداخت */
  callbackUrl?: string;
}

// ─── اطلاعات درایور فعال (برای خروجی getEnabledDrivers) ───
export interface ActiveDriverInfo {
  id: string;
  label: string;
  driver: PaymentDriver;
}

// ─── لیست درگاه‌های پشتیبانی‌شده ───
export const SUPPORTED_GATEWAYS = [
  'blubank',
  'zarinpal',
  'idpay',
  'payping',
  'stripe',
  'paypal',
  'crypto',
] as const;

export type SupportedGateway = typeof SUPPORTED_GATEWAYS[number];

// ─── سرویس پرداخت چنددرگاهی ───
export class PaymentService {
  private config: PaymentConfig;
  private drivers: Map<string, PaymentDriver>;

  constructor(config: PaymentConfig) {
    this.config = config;
    this.drivers = this.buildDrivers(config);
  }

  // ─── ساخت Map از درایورها برای تمام درگاه‌های فعال ───
  private buildDrivers(config: PaymentConfig): Map<string, PaymentDriver> {
    const map = new Map<string, PaymentDriver>();

    for (const gw of config.gateways || []) {
      if (!gw.enabled) continue;

      const driver = this.createDriverForGateway(gw);
      if (driver) {
        map.set(gw.id, driver);
      }
    }

    return map;
  }

  // ─── ایجاد درایور برای یک درگاه مشخص ───
  private createDriverForGateway(gw: GatewayConfig): PaymentDriver | null {
    const c = gw.config || {};

    try {
      switch (gw.id) {
        case 'zarinpal':
          return new ZarinpalDriver(c.merchantId || '', !!c.sandbox);

        case 'idpay':
          return new IDPayDriver(c.apiKey || '', !!c.sandbox);

        case 'payping':
          return new PayPingDriver(c.apiKey || '', c.clientId || '');

        case 'blubank':
          return new BlubankDriver(c.merchantCode || '', c.terminalCode || '');

        case 'stripe':
          return new StripeDriver(c.secretKey || '', c.publishableKey || '');

        case 'paypal':
          return new PayPalDriver(c.clientId || '', c.clientSecret || '', c.sandbox !== false);

        case 'crypto':
          return new CryptoDriver(Array.isArray(c.wallets) ? c.wallets : []);

        default:
          console.warn(`درگاه "${gw.id}" پشتیبانی نمی‌شود.`);
          return null;
      }
    } catch (err) {
      console.warn(`خطا در ایجاد درایور "${gw.id}":`, err);
      return null;
    }
  }

  // ═══════════════════════════════════════════════
  // متدهای جدید — چنددرگاهی
  // ═══════════════════════════════════════════════

  /** دریافت لیست درگاه‌های فعال (enabled: true) */
  getEnabledGateways(): GatewayConfig[] {
    return (this.config.gateways || []).filter(gw => gw.enabled);
  }

  /** دریافت لیست درگاه‌های فعال همراه با درایورهایشان */
  getEnabledDrivers(): ActiveDriverInfo[] {
    const result: ActiveDriverInfo[] = [];
    for (const gw of this.getEnabledGateways()) {
      const driver = this.drivers.get(gw.id);
      if (driver) {
        result.push({ id: gw.id, label: gw.label, driver });
      }
    }
    return result;
  }

  /** ایجاد تراکنش با درگاه مشخص */
  async createPaymentForGateway(
    gatewayId: string,
    amount: number,
    metadata: PaymentMetadata,
  ): Promise<PaymentResult> {
    const driver = this.drivers.get(gatewayId);
    if (!driver) {
      throw new Error(
        `درگاه "${gatewayId}" فعال نیست یا درایور آن موجود نیست. ` +
        `درگاه‌های فعال: ${this.getEnabledGateways().map(g => g.id).join(', ') || 'هیچ‌کدام'}`
      );
    }

    return driver.createPayment(amount, {
      ...metadata,
      callbackUrl: metadata.callbackUrl || this.config.callbackUrl,
    });
  }

  /** تأیید تراکنش با درگاه مشخص */
  async verifyPaymentForGateway(
    gatewayId: string,
    transactionId: string,
  ): Promise<VerifyResult> {
    const driver = this.drivers.get(gatewayId);
    if (!driver) {
      throw new Error(`درگاه "${gatewayId}" فعال نیست.`);
    }

    return driver.verifyPayment(transactionId);
  }

  /** دریافت درایور بر اساس شناسه درگاه */
  getDriverByGateway(gatewayId: string): PaymentDriver | undefined {
    return this.drivers.get(gatewayId);
  }

  // ═══════════════════════════════════════════════
  // متدهای سازگار با نسخه قبلی (Backward Compatibility)
  // ═══════════════════════════════════════════════

  /**
   * ایجاد تراکنش — بدون gatewayId (سازگار با نسخه قبلی)
   * از اولین درگاه فعال استفاده می‌کند.
   */
  async createPayment(amount: number, metadata: PaymentMetadata): Promise<PaymentResult> {
    const driver = this.getDefaultDriver();
    return driver.createPayment(amount, {
      ...metadata,
      callbackUrl: metadata.callbackUrl || this.config.callbackUrl,
    });
  }

  /**
   * تأیید تراکنش — بدون gatewayId (سازگار با نسخه قبلی)
   * از اولین درگاه فعال استفاده می‌کند.
   */
  async verifyPayment(transactionId: string): Promise<VerifyResult> {
    const driver = this.getDefaultDriver();
    return driver.verifyPayment(transactionId);
  }

  /** بررسی وضعیت تراکنش (اگر درایور پشتیبانی کند) */
  async getTransactionStatus(transactionId: string): Promise<VerifyResult> {
    const driver = this.getDefaultDriver();
    if (driver.getTransactionStatus) {
      return driver.getTransactionStatus(transactionId);
    }
    return driver.verifyPayment(transactionId);
  }

  /** دریافت شناسه اولین درگاه فعال */
  getActiveGateway(): string {
    const enabled = this.getEnabledGateways();
    return enabled[0]?.id || '';
  }

  /** دریافت ارز پیش‌فرض */
  getCurrency(): string {
    return this.config.defaultCurrency || 'IRR';
  }

  /** دریافت مستقیم درایور پیش‌فرض (اولین درگاه فعال) */
  getDriver(): PaymentDriver {
    return this.getDefaultDriver();
  }

  /**
   * تغییر درگاه‌ها در زمان اجرا.
   * پشتیبانی از ساختار جدید (gateways[]) و قدیمی (activeGateway + gatewaySettings).
   */
  switchGateway(newConfig: PaymentConfig): void {
    this.config = newConfig;
    this.drivers = this.buildDrivers(newConfig);
  }

  // ─── متد داخلی: دریافت اولین درایور فعال ───
  private getDefaultDriver(): PaymentDriver {
    const firstEnabled = this.getEnabledGateways()[0];
    if (firstEnabled) {
      const driver = this.drivers.get(firstEnabled.id);
      if (driver) return driver;
    }

    // اگر هیچ درگاهی فعال نیست، خطا
    if (this.drivers.size === 0) {
      throw new Error(
        'هیچ درگاه پرداختی فعال نیست. لطفاً از پنل مدیریت حداقل یک درگاه را فعال کنید.'
      );
    }

    // fallback به اولین درایور موجود
    return this.drivers.values().next().value as PaymentDriver;
  }
}

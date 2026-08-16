import { useState } from 'react';

export const useFormState = <T,>(initialState: T) => useState<T>(initialState);

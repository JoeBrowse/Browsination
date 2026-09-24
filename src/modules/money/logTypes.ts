import type { LogTypeDef } from '@/core/logs/types'
import { CHECKIN_TYPE } from './repo'

export const moneyLogTypes: LogTypeDef[] = [{ type: CHECKIN_TYPE, module: 'money', label: 'Money check-in', value: { label: 'Net worth', unit: 'pence' }, fields: [{ key: 'accounts', label: 'Accounts', kind: 'number' }] }]

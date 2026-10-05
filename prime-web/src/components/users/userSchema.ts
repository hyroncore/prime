import { z } from 'zod'
import { USER_FORM_TEXT } from './userFormConstants'

export const userSchema = z.object({
  username: z
    .string()
    .trim()
    .min(1, USER_FORM_TEXT.usernameRequired)
    .regex(/^[A-Za-z0-9._]+$/, USER_FORM_TEXT.usernameFormat),
  password: z
    .string()
    .min(1, USER_FORM_TEXT.passwordRequired)
    .min(8, USER_FORM_TEXT.passwordLength)
    .regex(/[A-Za-z]/, USER_FORM_TEXT.passwordLetter)
    .regex(/[0-9]/, USER_FORM_TEXT.passwordNumber),
  role: z.enum(['standard', 'admin', 'system_manager']),
  active: z.boolean(),
})

export type UserFormValues = z.infer<typeof userSchema>

import { z } from 'zod'
import { USER_EDIT_FORM_TEXT } from './userEditFormConstants'

export const userEditSchema = z.object({
  role: z.enum(['Admin', 'Manager', 'User'], {
    required_error: USER_EDIT_FORM_TEXT.roleRequired,
  }),
  active: z.boolean({
    required_error: USER_EDIT_FORM_TEXT.activeRequired,
  }),
})

export type UserEditFormValues = z.infer<typeof userEditSchema>

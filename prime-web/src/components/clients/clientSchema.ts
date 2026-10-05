import { z } from 'zod'
import { CLIENT_FORM_TEXT } from './clientFormConstants'

export const clientSchema = z.object({
  plantName: z.string().trim().min(1, CLIENT_FORM_TEXT.nameRequired),
  shortCode: z.string().trim().min(1, CLIENT_FORM_TEXT.shortCodeRequired),
  clientId: z.string().min(1, CLIENT_FORM_TEXT.linkedClientRequired),
})

export type ClientFormValues = z.infer<typeof clientSchema>

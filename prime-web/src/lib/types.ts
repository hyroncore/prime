export type RequisitionStatus =
  | 'NEW'
  | 'REVIEW'
  | 'DECLINED'
  | 'PROCESSING'
  | 'SUBMITTED'
  | 'WON'
  | 'LOST'

export interface AuditLogDto {
  id: number
  action: string
  statusFrom: string | null
  statusTo: string | null
  notes: string | null
  createdAt: string
}

export interface AttachmentDto {
  id: number
  requisitionId: number
  fileName: string
  contentType: string
  sizeBytes: number
  uploadedAt: string
}

export interface RequisitionDto {
  id: number
  identifier: string
  externalRef: string
  plantId: number
  plantName: string
  plantShortCode: string
  clientId: number
  clientName: string
  sectorCode: string
  sectorName: string
  title: string
  dueDate: string
  status: RequisitionStatus
  clientNotes: string | null
  createdAt: string
  receivedAt: string
  auditLogs?: AuditLogDto[]
  attachments?: AttachmentDto[]
}

export interface PlantDto {
  id: number
  clientId: number
  clientName: string
  plantName: string
  shortCode: string
}

export interface PlantDetailDto {
  id: number
  plantName: string
  shortCode: string
  clientId: number
  clientName: string
  clientContactName: string | null
  clientContactPhone: string | null
  openRequisitions: number
  totalRequisitions: number
  wonCount: number
  lostCount: number
  winRate: number
}

export interface ClientDto {
  id: number
  name: string
  primaryContactName: string | null
  primaryContactPhone: string | null
  createdAt: string
  plants: PlantDto[]
  openRequisitions: number
  totalWon: number
}

export interface SectorDto {
  code: string
  nameArabic: string
}

export interface UrgentRequisitionDto {
  id: number
  identifier: string
  title: string
  clientName: string
  plantName: string
  dueDate: string
  status: RequisitionStatus
  daysLeft: number
}

export interface RequisitionStatsDto {
  totalCount: number
  openCount: number
  overdueCount: number
  wonCount: number
  lostCount: number
  winRate: number
}

export interface SectorBreakdownDto {
  sectorCode: string
  sectorName: string
  total: number
  open: number
}

export interface ClientBreakdownDto {
  clientId: number
  clientName: string
  total: number
  open: number
  won: number
}

export interface DashboardStatsDto {
  openCount: number
  newCount: number
  reviewCount: number
  processingCount: number
  overdueCount: number
  submittedCount: number
  wonCount: number
  lostCount: number
  declinedCount: number
  totalCount: number
  winRate: number
  overdueRequisitions: UrgentRequisitionDto[]
  sectorBreakdown: SectorBreakdownDto[]
  clientBreakdown: ClientBreakdownDto[]
}

export interface CreateRequisitionRequest {
  externalRef: string
  plantId: number
  sectorCode: string
  title: string
  dueDate: string
  receivedAt?: string
  clientNotes?: string | null
}

export interface UpdateRequisitionRequest {
  externalRef: string
  plantId: number
  sectorCode: string
  title: string
  dueDate: string
  receivedAt?: string
  clientNotes?: string | null
}

export interface CreateClientRequest {
  name: string
  primaryContactName?: string | null
  primaryContactPhone?: string | null
  plants: { plantName: string; shortCode: string }[]
}

export interface UpdateClientRequest {
  name: string
  primaryContactName?: string | null
  primaryContactPhone?: string | null
}

export interface UpdatePlantRequest {
  plantName: string
  shortCode: string
  clientId: number
}

export interface NotificationDto {
  id: number
  requisitionId: number | null
  identifier: string | null
  type: string
  title: string
  message: string
  createdAt: string
  readAt: string | null
}

export interface NotificationsListDto {
  items: NotificationDto[]
  unreadCount: number
}

export interface UserDashboardStatsDto {
  myActiveRequisitions: number
  myDrafts: number
  awaitingReview: number
  awaitingSignOff: number
  reviseCount: number
  overdueCount: number
  wonCount: number
  lostCount: number
  winRate: number
  actionRequired: UrgentRequisitionDto[]
}

export interface PendingSignOffDto {
  id: number
  identifier: string
  title: string
  plantName: string
  clientName: string
  submittedAt: string
}

export interface TeamMemberStatsDto {
  userId: number
  displayName: string
  openRequisitions: number
  reviseCount: number
  submittedCount: number
  wonCount: number
  winRate: number
}

export interface ManagerDashboardStatsDto {
  teamVolume: number
  pendingReview: number
  pendingSignOff: number
  teamWinRate: number
  wonCount: number
  lostCount: number
  teamPerformance: TeamMemberStatsDto[]
  pendingReviews: UrgentRequisitionDto[]
  pendingSignOffs: PendingSignOffDto[]
}

export type UserRole = 'Admin' | 'Manager' | 'User'

export interface UserDto {
  id: number
  username: string
  displayName: string
  role: UserRole
  isActive: boolean
  createdAt: string
  lastLoginAt: string | null
}

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  token: string
  user: UserDto
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

export interface CreateUserRequest {
  username: string
  displayName: string
  role: UserRole
  initialPassword: string
}

export interface UpdateUserRequest {
  displayName: string
  role: UserRole
  isActive: boolean
}

export interface ResetPasswordRequest {
  newPassword: string
}
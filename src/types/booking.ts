export interface ExecutedProjectShowcase {
  id: string
  title: string
  location: string
  style: string
  budget: string
  beforeImageUrl: string
  afterImageUrl: string
  areaSqFt: number
  completionDays: number
  description: string
  clientReview: string
}

export interface LocalDecorator {
  id: string
  name: string
  firmName: string
  city: string
  neighborhood: string
  rating: number
  reviewsCount: number
  projectsCount: number
  primaryPhone: string
  whatsappNumber: string // Formatted without '+' or spaces for wa.me, e.g. "919820154321"
  specialties: string[]
  experienceYears: number
  verifiedBadge: boolean
  avatarUrl: string
  pricingTier: string
  address: string
}

export interface MeasurementBooking {
  id: string
  customerName: string
  phoneNumber: string
  email?: string
  address: string
  city: string
  roomType: string
  preferredDate: string
  preferredTimeSlot: 'morning' | 'afternoon' | 'evening'
  projectReference?: string
  status: 'pending' | 'measurer_assigned' | 'completed'
  createdAt: string
  supplierContact: string
}


import { useState } from 'react'
import { 
  Phone, 
  MessageCircle, 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  CheckCircle2, 
  Ruler, 
  ShieldCheck, 
  X,
  Hammer
} from 'lucide-react'
import { DECOME_SUPPLIER_CONTACT, createMeasurementBooking } from '../services/bookingService'

interface SupplierBookingModalProps {
  isOpen: boolean
  onClose: () => void
  initialProjectName?: string
  initialRoomType?: string
}

export function SupplierBookingModal({
  isOpen,
  onClose,
  initialProjectName = 'Selected Design',
  initialRoomType = 'Living Room'
}: SupplierBookingModalProps) {
  const [customerName, setCustomerName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('Mumbai')
  const [roomType, setRoomType] = useState(initialRoomType)
  const [preferredDate, setPreferredDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toISOString().split('T')[0]
  })
  const [preferredTimeSlot, setPreferredTimeSlot] = useState<'morning' | 'afternoon' | 'evening'>('morning')
  const [isBooked, setIsBooked] = useState(false)
  const [bookingId, setBookingId] = useState('')

  if (!isOpen) return null

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!customerName || !phoneNumber || !address) return

    const booking = createMeasurementBooking({
      customerName,
      phoneNumber,
      address,
      city,
      roomType,
      preferredDate,
      preferredTimeSlot,
      projectReference: initialProjectName
    })

    setBookingId(booking.id)
    setIsBooked(true)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6 text-slate-100 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Ruler className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white">Book On-Site Measurement</h3>
              <p className="text-xs text-slate-400">Send an expert measurer & connect with supplier</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800/60 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Decoration Supplier Fast Hotline Box */}
        <div className="p-4 bg-emerald-950/40 border border-emerald-500/30 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold">
              <ShieldCheck className="w-4 h-4" />
              <span>Certified Decoration Supplier Partner</span>
            </div>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
              Direct Hotline
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <a
              href={`tel:${DECOME_SUPPLIER_CONTACT.primaryPhone.replace(/\s+/g, '')}`}
              className="flex-1 py-2.5 px-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow"
            >
              <Phone className="w-4 h-4" />
              <span>Call: {DECOME_SUPPLIER_CONTACT.primaryPhone}</span>
            </a>

            <a
              href={DECOME_SUPPLIER_CONTACT.whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2.5 px-4 bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/40 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all"
            >
              <MessageCircle className="w-4 h-4" />
              <span>WhatsApp</span>
            </a>
          </div>
        </div>

        {isBooked ? (
          /* Success Screen */
          <div className="p-6 bg-slate-950/80 border border-emerald-500/40 rounded-2xl text-center space-y-4 animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h4 className="text-lg font-bold text-white">Measurement Expert Dispatched!</h4>
              <p className="text-xs text-slate-300">
                Booking ID: <span className="font-mono text-emerald-400 font-bold">{bookingId}</span>
              </p>
              <p className="text-xs text-slate-400 mt-2">
                Our certified spatial surveyor will arrive at <strong>{address}</strong> on <strong>{preferredDate}</strong> ({preferredTimeSlot}) with high-precision 3D laser equipment.
              </p>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-center space-x-2 text-xs text-slate-300">
              <Hammer className="w-4 h-4 text-emerald-400" />
              <span>Measurements sync directly to DECOME for turnkey fabrication.</span>
            </div>

            <button
              onClick={onClose}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-colors"
            >
              Return to DECOME
            </button>
          </div>
        ) : (
          /* Booking Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Your Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Aarav Sharma"
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Contact Number</label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Room / Home Address</label>
              <div className="relative">
                <MapPin className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <textarea
                  required
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Building, Flat No, Street, Locality (e.g. Tower B, 1402, Worli Seaface)"
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Room Type</label>
                <select
                  value={roomType}
                  onChange={(e) => setRoomType(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="Living Room">Living Room</option>
                  <option value="Master Bedroom">Master Bedroom</option>
                  <option value="Kitchen">Kitchen</option>
                  <option value="Home Office">Home Office</option>
                  <option value="Complete House">Complete House</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">Preferred Date</label>
                <div className="relative">
                  <Calendar className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="date"
                    required
                    value={preferredDate}
                    onChange={(e) => setPreferredDate(e.target.value)}
                    className="w-full pl-8 pr-2 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Preferred Time Window</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'morning', label: 'Morning (9AM - 1PM)' },
                  { id: 'afternoon', label: 'Afternoon (1PM - 5PM)' },
                  { id: 'evening', label: 'Evening (5PM - 8PM)' }
                ].map(slot => (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => setPreferredTimeSlot(slot.id as 'morning' | 'afternoon' | 'evening')}
                    className={`py-2 px-2 rounded-xl text-[11px] font-semibold border text-center transition-all ${
                      preferredTimeSlot === slot.id
                        ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                        : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Clock className="w-3 h-3 mx-auto mb-0.5 opacity-70" />
                    <span>{slot.label.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.99] text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center space-x-2 mt-4"
            >
              <Ruler className="w-4 h-4" />
              <span>Confirm & Dispatch Measurer to My Home</span>
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default function Input({ label, type, name, value, onChange, placeholder, required = false }) {
  return (
    <div className="space-y-2 sm:space-y-2.5 flex-shrink-0">
      <label htmlFor={name} className="block text-sm sm:text-base font-bold text-yellow-400 drop-shadow-md">
        {label}
      </label>
      <input
        type={type}
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="w-full px-4 sm:px-5 py-3 sm:py-3.5 bg-white/10 backdrop-blur-sm border-2 border-yellow-500/30 rounded-xl focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500/50 transition-all duration-300 text-sm sm:text-base text-white placeholder-white/50 shadow-lg hover:border-yellow-400/50"
      />
    </div>
  )
}


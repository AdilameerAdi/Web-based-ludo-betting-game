export default function Input({ label, type, name, value, onChange, placeholder, required = false }) {
  return (
    <div className="space-y-0.5 sm:space-y-1 flex-shrink-0">
      <label htmlFor={name} className="block text-xs sm:text-sm font-bold text-gray-700">
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
        className="w-full px-2.5 sm:px-3 py-1.5 sm:py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all duration-200 text-xs sm:text-sm text-gray-800 placeholder-gray-400"
      />
    </div>
  )
}


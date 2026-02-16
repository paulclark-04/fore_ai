export default function Card({ children, className = '', hover = false, ...props }) {
  return (
    <div
      className={`border-t-2 border-[#075056] pt-4 transition-all duration-100 ${
        hover ? 'hover:bg-[#F6F8F9]' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

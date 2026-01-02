export default function Loading() {
  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'var(--background)' }}
    >
      <div className="text-center">
        {/* Animated logo/spinner */}
        <div className="relative w-20 h-20 mx-auto mb-6">
          {/* Outer ring */}
          <div
            className="absolute inset-0 rounded-full border-4 border-transparent animate-spin"
            style={{
              borderTopColor: 'var(--primary)',
              animationDuration: '1s',
            }}
          />
          {/* Inner ring */}
          <div
            className="absolute inset-2 rounded-full border-4 border-transparent animate-spin"
            style={{
              borderBottomColor: 'var(--secondary)',
              animationDuration: '0.75s',
              animationDirection: 'reverse',
            }}
          />
          {/* Center dot */}
          <div
            className="absolute inset-1/3 rounded-full animate-pulse"
            style={{ background: 'var(--primary)' }}
          />
        </div>

        {/* Loading text */}
        <p
          className="text-lg font-bold animate-pulse"
          style={{
            fontFamily: 'var(--font-kindergarten)',
            color: 'var(--primary)',
          }}
        >
          Loading...
        </p>
      </div>
    </div>
  );
}

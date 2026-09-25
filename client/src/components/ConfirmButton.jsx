import { useEffect, useState } from 'react';

export default function ConfirmButton({ onConfirm, children, confirmLabel = 'Click again to confirm', className = 'btn btn-danger', disabled }) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return undefined;
    const timer = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(timer);
  }, [armed]);

  const handleClick = () => {
    if (!armed) {
      setArmed(true);
      return;
    }
    setArmed(false);
    onConfirm();
  };

  return (
    <button type="button" className={`${className}${armed ? ' is-armed' : ''}`} onClick={handleClick} disabled={disabled}>
      {armed ? confirmLabel : children}
    </button>
  );
}

import { Link } from 'react-router-dom';
import { Activity } from 'lucide-react';

export function Logo() {
  return (
    <Link to="/" className="brand">
      <span className="brandmark">
        <Activity size={18} />
      </span>
      beacon<span className="branddot">.</span>
    </Link>
  );
}

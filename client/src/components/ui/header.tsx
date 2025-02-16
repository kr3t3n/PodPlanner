import { FC } from 'react';
import { Link } from 'wouter';

export const Header: FC = () => {
  return (
    <header className="border-b">
      <div className="container mx-auto px-4 py-4">
        <Link href="/" className="text-2xl font-bold hover:text-primary transition-colors">
          PodPlanner
        </Link>
      </div>
    </header>
  );
};

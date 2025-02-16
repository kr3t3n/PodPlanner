import { FC } from 'react';
import { Link } from 'wouter';
import { Coffee } from 'lucide-react';

export const Footer: FC = () => {
  return (
    <footer className="border-t mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col items-center space-y-4">
          {/* First line: Navigation links */}
          <div className="flex space-x-4">
            <Link href="/terms" className="text-muted-foreground hover:text-primary transition-colors">
              Terms
            </Link>
            <Link href="/privacy" className="text-muted-foreground hover:text-primary transition-colors">
              Privacy
            </Link>
            <Link href="/contact" className="text-muted-foreground hover:text-primary transition-colors">
              Contact
            </Link>
          </div>

          {/* Second line: Buy me a coffee */}
          <a
            href="https://www.buymeacoffee.com/georgipep"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center space-x-2 text-muted-foreground hover:text-primary hover:scale-105 transition-all"
          >
            <Coffee className="w-4 h-4" />
            <span>Buy me a coffee</span>
          </a>

          {/* Third line: Created by */}
          <div className="text-muted-foreground text-center">
            Created by{' '}
            <a
              href="https://x.com/georgipep"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              @georgipep
            </a>
            {' | '}
            <span className="font-semibold">PodPlanner.xyz</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
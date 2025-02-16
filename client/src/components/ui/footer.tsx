import { FC } from 'react';
import { Link } from 'wouter';
import { Coffee } from 'lucide-react';

export const Footer: FC = () => {
  return (
    <footer className="border-t mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
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
          
          <div className="flex items-center space-x-4">
            <a
              href="https://www.buymeacoffee.com/georgipep"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-2 text-muted-foreground hover:text-primary transition-colors"
            >
              <Coffee className="w-4 h-4" />
              <span>Buy me a coffee</span>
            </a>
            
            <div className="text-muted-foreground">
              Created by{' '}
              <a
                href="https://twitter.com/georgipep"
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
      </div>
    </footer>
  );
};

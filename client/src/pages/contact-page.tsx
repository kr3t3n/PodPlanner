import { FC } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, Twitter } from 'lucide-react';

const ContactPage: FC = () => {
  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="p-6">
        <h1 className="text-3xl font-bold mb-6">Contact Us</h1>
        <div className="prose dark:prose-invert">
          <p className="lead mb-6">Have questions? We'd love to hear from you.</p>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Mail className="w-5 h-5" />
              <a href="mailto:contact@podplanner.xyz" className="text-primary hover:underline">
                contact@podplanner.xyz
              </a>
            </div>
            
            <div className="flex items-center space-x-3">
              <Twitter className="w-5 h-5" />
              <a href="https://twitter.com/georgipep" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                @georgipep
              </a>
            </div>
          </div>
          
          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Support PodPlanner</h2>
            <p>If you find PodPlanner useful, consider supporting its development:</p>
            <Button
              asChild
              className="mt-4"
            >
              <a
                href="https://www.buymeacoffee.com/georgipep"
                target="_blank"
                rel="noopener noreferrer"
              >
                Buy me a coffee ☕
              </a>
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ContactPage;

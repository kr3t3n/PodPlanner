import { FC } from 'react';
import { Card } from '@/components/ui/card';

const PrivacyPage: FC = () => {
  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="p-6">
        <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
        <div className="prose dark:prose-invert">
          <p className="lead">Your privacy is important to us. This Privacy Policy explains how PodPlanner.xyz collects, uses, and protects your information.</p>
          
          <h2>Information Collection</h2>
          <p>We collect information that you provide directly to us when you:</p>
          <ul>
            <li>Create an account</li>
            <li>Use our services</li>
            <li>Contact us for support</li>
          </ul>
          
          <h2>Data Usage</h2>
          <p>We use the collected information to:</p>
          <ul>
            <li>Provide and maintain our services</li>
            <li>Improve user experience</li>
            <li>Send important notifications</li>
          </ul>
          
          <h2>Data Protection</h2>
          <p>We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.</p>
          
          <h2>Contact Us</h2>
          <p>If you have questions about this Privacy Policy, please contact us.</p>
        </div>
      </Card>
    </div>
  );
};

export default PrivacyPage;

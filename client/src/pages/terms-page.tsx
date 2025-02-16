import { FC } from 'react';
import { Card } from '@/components/ui/card';

const TermsPage: FC = () => {
  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="p-6">
        <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
        <div className="prose dark:prose-invert">
          <h2>1. Terms</h2>
          <p>By accessing PodPlanner.xyz, you agree to be bound by these terms of service and agree that you are responsible for compliance with any applicable local laws.</p>
          
          <h2>2. Use License</h2>
          <p>Permission is granted to temporarily access the materials on PodPlanner.xyz for personal, non-commercial use only.</p>
          
          <h2>3. Disclaimer</h2>
          <p>The materials on PodPlanner.xyz are provided on an 'as is' basis. PodPlanner.xyz makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.</p>
          
          <h2>4. Limitations</h2>
          <p>In no event shall PodPlanner.xyz or its suppliers be liable for any damages arising out of the use or inability to use the materials on PodPlanner.xyz.</p>
          
          <h2>5. Revisions</h2>
          <p>The materials appearing on PodPlanner.xyz could include technical, typographical, or photographic errors. PodPlanner.xyz does not warrant that any of the materials on its website are accurate, complete or current.</p>
        </div>
      </Card>
    </div>
  );
};

export default TermsPage;

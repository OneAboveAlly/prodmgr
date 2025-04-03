import React, { useState } from 'react';
import StepList from './StepList';
import AddStepModal from './AddStepModal';

const GuideStepsSection = ({ steps, guideId }) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  return (
    <div className="space-y-4">
      <StepList
        steps={steps}
        guideId={guideId}
        onAddStepClick={() => setIsAddModalOpen(true)}
      />

      {isAddModalOpen && (
        <AddStepModal
          guideId={guideId}
          onClose={() => setIsAddModalOpen(false)}
        />
      )}
    </div>
  );
};

export default GuideStepsSection;

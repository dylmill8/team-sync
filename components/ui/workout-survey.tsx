// components/WorkoutSurveyModal.tsx
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

type SurveyData = {
  satisfaction: number;
  intensity: number;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: SurveyData) => void;
};

const WorkoutSurveyModal: React.FC<Props> = ({ open, onOpenChange, onSubmit }) => {
  const [satisfaction, setSatisfaction] = useState(3);
  const [intensity, setIntensity] = useState(3);

  const handleSubmit = () => {
    onSubmit({ satisfaction, intensity });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Workout Feedback</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>How satisfied are you with your workout?</Label>
            <Slider
              min={1}
              max={5}
              step={1}
              defaultValue={[satisfaction]}
              onValueChange={([val]) => setSatisfaction(val)}
            />
          </div>
          <div>
            <Label>How intense was your workout?</Label>
            <Slider
              min={1}
              max={5}
              step={1}
              defaultValue={[intensity]}
              onValueChange={([val]) => setIntensity(val)}
            />
          </div>
          <Button className="w-full mt-4" onClick={handleSubmit}>
            Submit
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WorkoutSurveyModal;

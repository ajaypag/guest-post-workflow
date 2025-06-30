'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Check, Clock, AlertCircle } from 'lucide-react';
import { GuestPostWorkflow, WORKFLOW_STEPS } from '@/types/workflow';
import { storage } from '@/lib/storage';
import StepForm from '@/components/StepForm';

export default function WorkflowDetail() {
  const params = useParams();
  const router = useRouter();
  const [workflow, setWorkflow] = useState<GuestPostWorkflow | null>(null);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const data = storage.getWorkflow(params.id as string);
    if (data) {
      setWorkflow(data);
      setActiveStep(data.currentStep);
    } else {
      router.push('/');
    }
  }, [params.id, router]);

  const handleStepSave = (inputs: Record<string, any>, outputs: Record<string, any>) => {
    if (!workflow) return;

    const updatedWorkflow = {
      ...workflow,
      updatedAt: new Date(),
      steps: workflow.steps.map((step, index) => {
        if (index === activeStep) {
          return {
            ...step,
            inputs,
            outputs,
            completedAt: new Date()
          };
        }
        return step;
      })
    };

    setWorkflow(updatedWorkflow);
    storage.saveWorkflow(updatedWorkflow);
  };

  const getStepIcon = (step: any, index: number) => {
    if (step.status === 'completed') {
      return <Check className="w-5 h-5 text-green-600" />;
    } else if (index === activeStep) {
      return <Clock className="w-5 h-5 text-blue-600" />;
    } else {
      return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  if (!workflow) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/"
          className="inline-flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Workflows
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-2xl font-bold mb-2">{workflow.clientName}</h2>
        <p className="text-gray-600">Target: {workflow.targetDomain}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-4">
            <h3 className="font-semibold mb-4">Workflow Progress</h3>
            <div className="space-y-2">
              {workflow.steps.map((step, index) => (
                <button
                  key={step.id}
                  onClick={() => setActiveStep(index)}
                  className={`w-full text-left px-3 py-2 rounded-md flex items-center gap-2 transition-colors ${
                    index === activeStep
                      ? 'bg-blue-50 text-blue-700'
                      : step.status === 'completed'
                      ? 'bg-green-50 text-green-700 hover:bg-green-100'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  {getStepIcon(step, index)}
                  <span className="text-sm">{step.title}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <StepForm
            step={workflow.steps[activeStep]}
            stepIndex={activeStep}
            workflow={workflow}
            onSave={handleStepSave}
          />
        </div>
      </div>
    </div>
  );
}
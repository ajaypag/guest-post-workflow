'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Check, Clock, AlertCircle, FileText, Package } from 'lucide-react';
import AuthWrapper from '@/components/AuthWrapper';
import Header from '@/components/Header';
import { GuestPostWorkflow, WORKFLOW_STEPS } from '@/types/workflow';
import { storage } from '@/lib/storage';
import StepForm from '@/components/StepForm';

export default function WorkflowDetail() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [workflow, setWorkflow] = useState<GuestPostWorkflow | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadWorkflow = async () => {
      try {
        const data = await storage.getWorkflow(params.id as string);
        if (data) {
          setWorkflow(data);
          
          // Check if workflow is from an order and fetch order details
          if (data.metadata?.orderId) {
            try {
              const orderResponse = await fetch(`/api/orders/${data.metadata.orderId}`);
              if (orderResponse.ok) {
                const orderData = await orderResponse.json();
                setOrderDetails(orderData);
              }
            } catch (error) {
              console.error('Error fetching order details:', error);
            }
          }
          
          // Check if there's a step parameter in the URL
          const stepParam = searchParams.get('step');
          if (stepParam) {
            const stepIndex = parseInt(stepParam, 10);
            if (stepIndex >= 0 && stepIndex < data.steps.length) {
              setActiveStep(stepIndex);
            } else {
              setActiveStep(0);
            }
          } else {
            setActiveStep(0);
          }
        } else {
          router.push('/');
        }
      } catch (error) {
        console.error('Error loading workflow:', error);
        router.push('/');
      }
    };
    
    loadWorkflow();
  }, [params.id, router, searchParams]);

  // Function to update URL when step changes
  const updateStepInUrl = (stepIndex: number) => {
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.set('step', stepIndex.toString());
    router.replace(currentUrl.pathname + currentUrl.search, { scroll: false });
  };

  // Function to change active step and update URL
  const changeActiveStep = (stepIndex: number) => {
    setActiveStep(stepIndex);
    updateStepInUrl(stepIndex);
    
    // Scroll active step into view in sidebar
    setTimeout(() => {
      if (sidebarRef.current) {
        const activeButton = sidebarRef.current.querySelector(`button:nth-child(${stepIndex + 1})`);
        if (activeButton) {
          activeButton.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
        }
      }
    }, 100);
  };

  const handleStepSave = async (inputs: Record<string, any>, outputs: Record<string, any>, isManualSave: boolean = false) => {
    if (!workflow) return;

    try {
      const updatedWorkflow = {
        ...workflow,
        updatedAt: new Date(),
        steps: workflow.steps.map((step, index) => {
          if (index === activeStep) {
            const updatedStep = {
              ...step,
              inputs: inputs || {},
              outputs: outputs || {},
              // Only mark as completed and set completedAt on manual save
              ...(isManualSave ? {
                completedAt: new Date(),
                status: 'completed' as const
              } : {})
            };
            return updatedStep;
          }
          return step;
        })
      };

      setWorkflow(updatedWorkflow);
      await storage.saveWorkflow(updatedWorkflow);
      
      // Only auto-advance on manual save (user clicking save button), not on auto-save
      if (isManualSave && activeStep < workflow.steps.length - 1) {
        console.log('📍 Auto-advancing to next step after manual save');
        // Update the currentStep field in the workflow and advance UI
        const nextStep = activeStep + 1;
        const workflowWithAdvancedStep = { 
          ...updatedWorkflow, 
          currentStep: nextStep 
        };
        setWorkflow(workflowWithAdvancedStep);
        await storage.saveWorkflow(workflowWithAdvancedStep);
        changeActiveStep(nextStep);
      } else if (!isManualSave) {
        console.log('💾 Auto-save completed - staying on current step');
      }
    } catch (error) {
      console.error('Error saving step:', error);
      alert('Failed to save step. Please try again.');
    }
  };

  // Handle workflow changes (for keyword preferences stored in metadata)
  const handleWorkflowChange = async (updatedWorkflow: GuestPostWorkflow) => {
    try {
      setWorkflow(updatedWorkflow);
      await storage.saveWorkflow(updatedWorkflow);
    } catch (error) {
      console.error('Error saving workflow:', error);
      alert('Failed to save workflow changes. Please try again.');
    }
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
    <AuthWrapper>
      <div className="min-h-screen bg-gray-50">
        <Header />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6 flex items-center justify-between">
            <Link
              href={workflow.metadata?.orderId ? `/orders/${workflow.metadata.orderId}/internal` : "/"}
              className="inline-flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {workflow.metadata?.orderId ? 'Back to Order' : 'Back to Workflows'}
            </Link>
            <div className="flex items-center gap-3">
              {workflow.metadata?.orderId && orderDetails && (
                <div className="inline-flex items-center px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-sm font-medium">
                  <Package className="w-4 h-4 mr-2" />
                  Order #{orderDetails.orderNumber || workflow.metadata.orderId.slice(0, 8)}
                </div>
              )}
              <Link
                href={`/workflow/${workflow.id}/overview`}
                className="inline-flex items-center px-4 py-2 bg-gray-50 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <FileText className="w-4 h-4 mr-2" />
                Overview
              </Link>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm mb-6">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-3xl font-semibold text-gray-900">{workflow.clientName}</h1>
                  {workflow.metadata?.orderId && orderDetails && (
                    <p className="text-sm text-gray-600 mt-1">
                      From Order #{orderDetails.orderNumber || workflow.metadata.orderId.slice(0, 8)} • 
                      Domain: {workflow.targetDomain} • 
                      {orderDetails.lineItems?.length || 0} total guest posts
                    </p>
                  )}
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-full px-4 py-2">
                  <span className="text-gray-600 text-sm font-medium">Guest Post Campaign</span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                  <div className="flex items-center mb-3">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full mr-3"></div>
                    <span className="text-gray-500 text-sm font-medium uppercase tracking-wide">Target Site</span>
                  </div>
                  <p className="text-gray-900 font-semibold text-lg truncate">
                    {workflow.steps.find(s => s.id === 'domain-selection')?.outputs?.domain || 
                     workflow.targetDomain || 
                     'Not selected yet'}
                  </p>
                </div>
                
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                  <div className="flex items-center mb-3">
                    <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                    <span className="text-gray-500 text-sm font-medium uppercase tracking-wide">Keyword</span>
                  </div>
                  <p className="text-gray-900 font-semibold text-lg truncate">
                    {workflow.steps.find(s => s.id === 'topic-generation')?.outputs?.finalKeyword || 
                     'Not determined yet'}
                  </p>
                </div>
                
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                  <div className="flex items-center mb-3">
                    <div className="w-3 h-3 bg-purple-500 rounded-full mr-3"></div>
                    <span className="text-gray-500 text-sm font-medium uppercase tracking-wide">Article Title</span>
                  </div>
                  <p className="text-gray-900 font-semibold leading-tight">
                    {workflow.steps.find(s => s.id === 'topic-generation')?.outputs?.postTitle || 
                     'Not created yet'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow p-3 lg:sticky lg:top-6">
                <h3 className="font-semibold mb-3 text-sm">Workflow Progress</h3>
                <div ref={sidebarRef} className="max-h-[calc(100vh-12rem)] overflow-y-auto space-y-1 pr-1">
                  {workflow.steps.map((step, index) => (
                    <button
                      key={step.id}
                      onClick={() => changeActiveStep(index)}
                      className={`w-full text-left px-2 py-1.5 rounded-md flex items-center gap-2 transition-colors ${
                        index === activeStep
                          ? 'bg-blue-600 text-white'
                          : step.status === 'completed'
                          ? 'bg-green-50 text-green-700 hover:bg-green-100'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className={`text-xs font-semibold px-1 py-0.5 rounded ${
                          index === activeStep
                            ? 'bg-blue-800 text-white'
                            : step.status === 'completed'
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-400 text-white'
                        }`}>
                          {index}
                        </span>
                        {getStepIcon(step, index)}
                      </div>
                      <span className="text-xs flex-1 leading-tight">{step.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-4">
              <StepForm
                step={workflow.steps[activeStep]}
                stepIndex={activeStep}
                workflow={workflow}
                onSave={handleStepSave}
                onWorkflowChange={handleWorkflowChange}
              />
            </div>
          </div>
        </div>
      </div>
    </AuthWrapper>
  );
}
'use client';

import React from 'react';

interface WizardHeaderProps {
  currentStep: number;
  completedSteps: number[];
  progress: number;
}

export const WizardHeader: React.FC<WizardHeaderProps> = ({
  currentStep,
  completedSteps,
  progress,
}) => {
  // Note: this is a client component entry and props must be serializable.
  // Instead of receiving a function prop (which is non-serializable), this
  // component dispatches a DOM CustomEvent 'wizardStepClick' with
  // { detail: { step } } when a clickable step is activated. Parent
  // components in client code should listen for this event on the
  // container element (or `window`) and handle navigation.
  const dispatchStepClick = (step: number) => {
    try {
      const ev = new CustomEvent('wizardStepClick', { detail: { step } });
      // Dispatch from document so parent listeners can pick it up.
      document.dispatchEvent(ev);
    } catch (err) {
      // noop - CustomEvent might be unavailable in some SSR contexts, but
      // this is a client component so it should be fine at runtime.
    }
  };

  const steps = [
    { number: 1, label: 'Formatting' },
    { number: 2, label: 'Unit' },
    { number: 3, label: 'Header' },
    { number: 4, label: 'Optional' },
    { number: 5, label: 'Body' },
    { number: 6, label: 'Closing' },
    { number: 7, label: 'Distribution' },
    { number: 8, label: 'Review' }
  ];

  const isStepClickable = (stepNum: number) => {
    return completedSteps.includes(stepNum) || stepNum === currentStep;
  };

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '30px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    }}>
      {/* Branding Header */}
      <div style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: 'bold',
          background: 'linear-gradient(45deg, #C8102E, #FFD700)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: '8px'
        }}>
          🦅 MARINE CORPS DIRECTIVES FORMATTER
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#6c757d', margin: 0 }}>
          by Semper Admin | Last Updated: 20251013
        </p>
      </div>

      {/* Step Breadcrumbs */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        {steps.map((step, index) => (
          <React.Fragment key={step.number}>
            <div
              onClick={() => isStepClickable(step.number) && dispatchStepClick(step.number)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                cursor: isStepClickable(step.number) ? 'pointer' : 'not-allowed',
                opacity: isStepClickable(step.number) ? 1 : 0.5
              }}
            >
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                fontSize: '1rem',
                backgroundColor: completedSteps.includes(step.number)
                  ? '#10b981'
                  : step.number === currentStep
                  ? '#C8102E'
                  : '#e5e7eb',
                color: completedSteps.includes(step.number) || step.number === currentStep
                  ? 'white'
                  : '#6b7280',
                marginBottom: '8px'
              }}>
                {completedSteps.includes(step.number) ? '✓' : step.number}
              </div>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: step.number === currentStep ? 'bold' : 'normal',
                color: step.number === currentStep ? '#C8102E' : '#6b7280'
              }}>
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div style={{
                flex: 1,
                height: '2px',
                backgroundColor: completedSteps.includes(step.number) ? '#10b981' : '#e5e7eb',
                margin: '0 8px',
                position: 'relative',
                top: '-16px'
              }} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Progress Bar */}
      <div style={{
        width: '100%',
        height: '12px',
        backgroundColor: '#e5e7eb',
        borderRadius: '6px',
        overflow: 'hidden'
      }}>
        <div style={{
          width: `${progress}%`,
          height: '100%',
          background: 'linear-gradient(90deg, #C8102E 0%, #FFD700 100%)',
          transition: 'width 0.3s ease'
        }} />
      </div>
      <div style={{
        textAlign: 'right',
        fontSize: '0.75rem',
        color: '#6b7280',
        marginTop: '4px'
      }}>
        {Math.round(progress)}% Complete
      </div>

    </div>
  );
};
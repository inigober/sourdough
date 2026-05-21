type WelcomeStepProps = {
  onStart: () => void;
};

export function WelcomeStep({ onStart }: WelcomeStepProps) {
  return (
    <div className="welcome-screen">
      <section className="hero welcome-screen__hero">
        <h1>Sourdough recipe builder</h1>
        <p className="hero-copy">
          Set your dough size, flour blend, hydration, fermentation context, and handling choices
          step by step. The app calculates ingredient weights and gives rule-based coaching when you
          finish — all on one review screen.
        </p>
      </section>
      <button type="button" className="wizard-button wizard-button--primary welcome-screen__start" onClick={onStart}>
        Start recipe
      </button>
    </div>
  );
}

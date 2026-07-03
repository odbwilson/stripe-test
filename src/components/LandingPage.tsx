interface LandingPageProps {
  onGetStarted: () => void;
}

export function LandingPage({ onGetStarted }: LandingPageProps) {
  return (
    <div className="landing">
      <section className="hero">
        <div className="hero-content">
          <h1>Ditch the Crowds, Keep the Customers.</h1>
          <p className="hero-subtitle">
            Transform your restaurant's waiting experience with our seamless,
            hardware-light Queue Management System.
          </p>
          <button onClick={onGetStarted} className="cta-button">
            Start Your 1-Day Free Trial
          </button>
        </div>
      </section>

      <section className="problem">
        <div className="container">
          <h2>Are long lines and crowded entrances costing you customers?</h2>
          <p>
            Our smart Queue Management System eliminates the chaos of physical
            lines and expensive ticketing kiosks. Let your customers wait
            comfortably anywhere, while your staff manages the flow effortlessly
            from a single screen.
          </p>
        </div>
      </section>

      <section className="how-it-works">
        <div className="container">
          <h2>How It Works in 3 Simple Steps</h2>
          <div className="steps">
            <div className="step">
              <div className="step-number">1</div>
              <h3>Scan &amp; Go</h3>
              <p className="step-sub">(No App Required)</p>
              <p>
                Customers arriving at your restaurant simply scan a custom QR
                code displayed at your storefront using their smartphone camera.
              </p>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <h3>Get a Digital Ticket</h3>
              <p>
                They instantly receive their queue number and estimated wait
                time directly on their browser. Their screen updates in
                real-time as the line moves — no refreshing required.
              </p>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <h3>Tap to Call</h3>
              <p>
                Your host uses any standard tablet at the greeting stand. With a
                single tap, the next number is called, notifying the customer
                instantly that their table is ready.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="why">
        <div className="container">
          <h2>Why Choose Our System?</h2>
          <div className="benefits">
            <div className="benefit">
              <h3>Zero Expensive Hardware</h3>
              <p>
                Forget about buying, maintaining, and repairing bulky ticketing
                machines or pagers. All you need is a printed QR code and a
                basic tablet.
              </p>
            </div>
            <div className="benefit">
              <h3>Enterprise-Grade Reliability</h3>
              <p>
                Built on robust, modern cloud infrastructure (AWS Amplify), our
                system is designed for high availability and failover
                redundancy. Stays lightning-fast even during your busiest
                Friday night rushes.
              </p>
            </div>
            <div className="benefit">
              <h3>Reduce "Walk-Aways"</h3>
              <p>
                Customers are happier when they aren't trapped in a crowded
                lobby. Give them the freedom to grab a coffee or wait in their
                car without the fear of losing their spot.
              </p>
            </div>
            <div className="benefit">
              <h3>Frictionless Setup</h3>
              <p>
                Deploy the system in your restaurant in less than 10 minutes.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="pricing">
        <div className="container">
          <h2>Ready to Streamline Your Front-of-House?</h2>
          <p>
            Experience the difference a modern queue architecture makes during
            your peak service hours.
          </p>
          <div className="pricing-card">
            <div className="pricing-header">
              <h3>Annual Plan</h3>
              <div className="price">
                <span className="amount">US$99.90</span>
                <span className="period">/year</span>
              </div>
            </div>
            <ul className="pricing-features">
              <li>1-day free trial</li>
              <li>Unlimited queuing</li>
              <li>Real-time customer notifications</li>
              <li>Priority support</li>
              <li>Cancel anytime</li>
            </ul>
            <button onClick={onGetStarted} className="cta-button">
              Start Your 1-Day Free Trial
            </button>
          </div>
          <div className="trial-steps">
            <h3>How your trial works:</h3>
            <ol>
              <li>
                <strong>Create your account:</strong> Register your restaurant's
                details and instantly access your dashboard.
              </li>
              <li>
                <strong>Secure setup:</strong> Enter your credit card details
                via our secure Stripe checkout to activate the trial. You will
                not be charged a single cent today.
              </li>
              <li>
                <strong>Test it risk-free:</strong> Enjoy 1 day of unlimited
                queuing and priority support.
              </li>
              <li>
                <strong>Seamless continuation:</strong> After the trial ends,
                your account will automatically transition to our annual plan
                for just US$99.90/year, ensuring zero interruption to your
                service. Cancel anytime before the trial ends to avoid being
                billed.
              </li>
            </ol>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="container">
          <p>&copy; 2026 Queue Management. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

import React, { useState } from 'react';
import { useForm, ValidationError } from '@formspree/react';
import './CustomRequest.css';

export default function CustomRequest({ onBack }) {
  const [state, handleSubmit] = useForm('xzzgeakr');
  const [showTerms, setShowTerms] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  if (state.succeeded) {
    return (
      <section className="custom-request">
        <div className="custom-request__orb custom-request__orb--one" />
        <div className="custom-request__orb custom-request__orb--two" />

        <div className="custom-request__success">
          <span className="custom-request__success-badge">Request received</span>
          <h1>Thanks for sharing your digital pain point.</h1>
          <p>
            I&apos;ll review the request and build a practical solution when I can carve out focused hobby time.
            If it is urgent, mail me directly at{' '}
            <a href="mailto:saikiranubbani82@gmail.com">saikiranubbani82@gmail.com</a>.
          </p>
          <div className="custom-request__success-actions">
            <button className="custom-request__button custom-request__button--primary" onClick={onBack} type="button">
              Back to Portfolio
            </button>
            <button
              className="custom-request__button custom-request__button--secondary"
              onClick={() => window.location.reload()}
              type="button"
            >
              Send Another Request
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="custom-request">
      <div className="custom-request__orb custom-request__orb--one" />
      <div className="custom-request__orb custom-request__orb--two" />

      <div className="custom-request__shell">
        <div className="custom-request__topbar">
          <button className="custom-request__back" onClick={onBack} type="button">
            {'\u2190'} Back to Portfolio
          </button>
          <a className="custom-request__mail-link" href="mailto:saikiranubbani82@gmail.com">
            Urgent? Mail Directly
          </a>
        </div>

        <div className="custom-request__hero">
          <span className="custom-request__badge">Free custom build lane</span>
          <h1>You Name It, I&apos;ll Build It</h1>
          <p>
            Share your digital pain point, exact problem, and what you wish existed. If it fits my lane,
            I&apos;ll build it, host it here, and let you use it in your own way for free.
          </p>

          <div className="custom-request__notes">
            <div>
              <strong>Best for:</strong>
              <span>mini tools, workflow helpers, form automations, public utilities, and practical niche pages.</span>
            </div>
          </div>
        </div>

        <div className="custom-request__panel">
          <h2>Request Custom Build</h2>
          <form className="custom-request__form" onSubmit={handleSubmit}>
            <input type="hidden" name="requestType" value="Custom Build Request" />
            <input type="hidden" name="source" value="Launch Page" />

            <label htmlFor="custom-name">Name</label>
            <input id="custom-name" type="text" name="name" placeholder="Your name" required />
            <ValidationError prefix="Name" field="name" errors={state.errors} />

            <label htmlFor="custom-email">Email</label>
            <input id="custom-email" type="email" name="email" placeholder="you@example.com" required />
            <ValidationError prefix="Email" field="email" errors={state.errors} />

            <label htmlFor="custom-problem-name">Problem Name</label>
            <input
              id="custom-problem-name"
              type="text"
              name="problemName"
              placeholder="Give the page/tool a rough name"
              required
            />
            <ValidationError prefix="Problem Name" field="problemName" errors={state.errors} />

            <label htmlFor="custom-problem">Digital Pain Point</label>
            <textarea
              id="custom-problem"
              name="problem"
              rows="4"
              placeholder="What is painful today? What are you doing manually?"
              required
            />
            <ValidationError prefix="Problem" field="problem" errors={state.errors} />

            <label htmlFor="custom-explanation">Exact Explanation</label>
            <textarea
              id="custom-explanation"
              name="exactExplanation"
              rows="6"
              placeholder="Explain the workflow, users, inputs, outputs, and what success looks like."
              required
            />
            <ValidationError prefix="Exact Explanation" field="exactExplanation" errors={state.errors} />

            <label htmlFor="custom-expectations">Expectations</label>
            <textarea
              id="custom-expectations"
              name="expectations"
              rows="4"
              placeholder="Any must-have behavior, hosting expectations, or preferred style?"
            />
            <ValidationError prefix="Expectations" field="expectations" errors={state.errors} />

            <label className="custom-request__checkbox">
              <input
                type="checkbox"
                name="acceptedTerms"
                checked={acceptedTerms}
                onChange={(event) => setAcceptedTerms(event.target.checked)}
                required
              />
              <span>
                I accept the{' '}
                <button
                  className="custom-request__terms-link"
                  onClick={() => setShowTerms(true)}
                  type="button"
                >
                  Terms and Conditions
                </button>
              </span>
            </label>

            <button className="custom-request__button custom-request__button--primary" disabled={state.submitting} type="submit">
              {state.submitting ? 'Sending Request...' : 'Submit Request'}
            </button>
          </form>
        </div>
      </div>

      {showTerms && (
        <div className="custom-request__modal-overlay" onClick={() => setShowTerms(false)} role="presentation">
          <div className="custom-request__modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
            <div className="custom-request__modal-header">
              <h3>Terms and Conditions</h3>
              <button className="custom-request__modal-close" onClick={() => setShowTerms(false)} type="button">
                X
              </button>
            </div>
            <ol className="custom-request__terms-list">
              <li>
                I will deliver the solution if I pick it up, but it may take time because this is my part-time hobby
                and I need to make space for it.
              </li>
              <li>
                If it is urgent, mail directly to{' '}
                <a href="mailto:saikiranubbani82@gmail.com">saikiranubbani82@gmail.com</a>.
                Urgent requests are chargeable.
              </li>
            </ol>
            <button className="custom-request__button custom-request__button--secondary" onClick={() => setShowTerms(false)} type="button">
              Close
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

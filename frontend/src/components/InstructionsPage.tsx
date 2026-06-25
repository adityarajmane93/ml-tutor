// import React, { useState } from 'react';
import sammImg from "../images/samm_bar.png";
import timerImg from "../images/timer.png";
import learnImg from "../images/learnTab.png";
import notesImg from "../images/allNotes.png";
import canvasImg from "../images/canvas.png";
import componentsImg from "../images/components.png";

type SectionProps = {
  number: string;
  title: string;
  children: React.ReactNode;
  accent?: string;
  wide?: boolean;
  image?: string;
  img_width?: string;
};

const InstructionSection = ({
  number,
  title,
  children,
  accent = "#4f46e5",
  wide = false,
  image,
  img_width="100%",
}: SectionProps) => {
  return (
    <section
      className="neo-instruction-card"
      style={{
        padding: "18px",
        gridColumn: wide ? "1 / -1" : "auto", 
        display: "flex",
        flexDirection: "column",
        gap: "14px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <div
          className="neo-badge"
          style={{
            width: 34, height: 34,
            background: accent, // We keep background inline because it uses the dynamic 'accent' prop!
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {number}
        </div>
        <h2
          style={{
            margin: 0,
            fontSize: "1.05rem",
            fontWeight: 900,
            color: "#111827",
            textTransform: "uppercase",
            letterSpacing: "0.02em",
          }}
        >
          {title}
        </h2>
      </div>

      {image && (
        <div
          style={{
            marginBottom: "20px"
          }}
        >
          <img
            src={image}
            alt={title}
            style={{
              width: img_width,
              border: "2px solid #d1d5db",
              borderRadius: "8px"
            }}
          />
        </div>
      )}

      <div
        style={{
          fontSize: "0.96rem",
          lineHeight: 1.65,
          color: "#1f2937",
          textAlign: 'justify'
        }}
      >
        {children}
      </div>
    </section>
  );
};

export default function InstructionsPage({
  onComplete,
}: {
  onComplete: () => void;
}) {
  return (
    <div
      className="neo-page-wrapper"
      style={{
        minHeight: "100vh",
        padding: "24px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "1500px",
          margin: "0 auto",
        }}
      >
        {/* GRID CONTENT */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: "18px",
          }}
        >
          <InstructionSection
            number="1"
            title="The Canvas"
            accent="#4f46e5"
            image={canvasImg}
          >
            <p style={{ marginTop: 0, marginBottom: 0 }}>
              The Canvas is your workspace. You will build a Machine Learning
              pipeline by placing blocks and connecting them together.
            </p>
            <p style={{marginTop: 5, marginBottom: 0 }}>
              Data flows from left to right through the pipeline.
            </p>
            <p style={{ marginTop: 5,marginBottom: 0 }}>
              Description about the model's performance is shown in the Refection bar at the bottom of your screen. 
            </p>
          </InstructionSection>

          <InstructionSection
            number="2"
            title="Components (Blocks)"
            accent="#f59e0b"
            image={componentsImg}
          >
            <p style={{ marginTop: 0 }}>
              You will use four main blocks  to create your pipeline:
            </p>
            <ul style={{ margin: "8px 0 0 18px", padding: 0 }}>
              <li>
                <b>Dataset</b> — upload your data.
              </li>
              <li>
                <b>Preprocessing</b> — clean and prepare the data.
              </li>
              <li>
                <b>Model</b> — choose the ML algorithm.
              </li>
              <li>
                <b>Evaluation</b> — see the final accuracy.
              </li>
            </ul>
            <p style={{ marginTop: 8 }}>
              Edges (Arrows) are used to connect the blocks.
            </p>
          </InstructionSection>

          <InstructionSection
            number="3"
            title="Feelings Bar (SAMM)"
            accent="#ec4899"
            image={sammImg}
          >
            <p style={{ marginTop: 0 }}>
              The blue-highlighted SAMM bar at the top will flash during the
              activity.
            </p>
            <ul style={{ margin: "8px 0 0 18px", padding: 0 }}>
              <li>Unhappy → Happy</li>
              <li>Calm → Excited</li>
              <li>In Control (Doing what you wanted to do) → Controlled (Doing, what someone else wants you to do)</li>
            </ul>
            <p style={{ marginBottom: 0 }}>
              Report your feelings honestly. There are no right or wrong. 
              answers.
            </p>
            <p style={{ margin: "0" }}>
              You are not judged/penalized based on your answers.
            </p>
          </InstructionSection>

          <InstructionSection
            number="4"
            title="Activity Timer"
            accent="#3b82f6"
            image={timerImg}
            img_width="40%"
          >
            <ul style={{ margin: "8px 0 0 18px", padding: 0 }}>
              <li>The time is shown by clicking on the timer icon on the top-right corner of your screen. </li>
              <li>The timer shows the time elapsed since you have started the activity.</li>
              <li>You are not penalized based on the time taken to complete the activity.</li>
            </ul>
          </InstructionSection>

          <InstructionSection
            number="5"
            title="Learn Tab"
            accent="#10b981"
            image={learnImg}
          >
            <p style={{ marginTop: 0 }}>
              Click any node and then press <b>Learn</b> Button on the top-right side of your screen.
            </p>
            <p style={{ marginBottom: 0 }}>
              The Learn tab explains the block or arrow in detail. You can also
              highlight content and save notes.
            </p>
          </InstructionSection>

          <InstructionSection
            number="6"
            title="All Notes Tab"
            accent="#8b5cf6"
            image={notesImg}
          >
            <p style={{ marginTop: 0 }}>
              You can create study notes inside the Learn tab.
            </p>
            <ul style={{ margin: "8px 0 0 18px", padding: 0 }}>
              <li>Highlight text</li>
              <li>Type your thoughts</li>
              <li>Save your notes</li>
              <li>Review all notes later in the notebook view</li>
            </ul>
          </InstructionSection>

          <InstructionSection
            number="7"
            title="Your Task"
            accent="#ef4444"
            wide
          >
            <p style={{ marginTop: 0 }}>
              Build a strong machine learning pipeline and achieve the best
              accuracy.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
                gap: "12px",
                marginTop: "16px",
              }}
            >
              {[
                "1. Upload Dataset",
                "2. Add Preprocessing",
                "3. Select Model",
                "4. Add Evaluation",
                "5. Run Pipeline",
                "6. Improve Accuracy",
              ].map((item, idx) => (
                <div
                  key={item}
                  className="neo-task-card"
                  style={{
                    padding: "12px 10px",
                    textAlign: "center", 
                    fontSize: "0.9rem",
                  }}
                >
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: "999px",
                      background:
                        idx === 0
                          ? "#a855f7"
                          : idx === 1
                          ? "#f59e0b"
                          : idx === 2
                          ? "#ef4444"
                          : idx === 3
                          ? "#22c55e"
                          : idx === 4
                          ? "#eab308"
                          : "#3b82f6",
                      color: "#fff",
                      fontWeight: 900,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 8px auto",
                    }}
                  >
                    {idx + 1}
                  </div>
                  {item}
                </div>
              ))}
            </div>
          </InstructionSection>
        </div>

        {/* BUTTON */}
        <div style={{ marginTop: "22px", background: "#ffffff", padding: "18px" }}>
          <button
            className="neo-btn" /* <-- Handles borders, shadows, hovers, and click animations automatically! */
            onClick={onComplete}
            style={{
              width: "60%",
              padding: "18px",
              backgroundColor: "#fbbf24", // Override the default primary color
              fontSize: "1.5rem",
              textTransform: "uppercase",
              textAlign: "center",
            }}
          >
            Acknowledge & Proceed
          </button>
        </div>
      </div>
    </div>
  );
}
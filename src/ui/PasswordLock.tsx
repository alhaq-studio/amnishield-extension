import { useState } from "react";
import { verifyPassword, verifySecurityAnswer, hashPassword } from "../lib/password";
import { btnPrimary, btnOutline, inputCls } from "./components";

interface PasswordLockProps {
  storedHash: string;
  storedQuestion?: string;
  storedAnswerHash?: string;
  onUnlock: () => void;
  onEmergencyReset: () => Promise<void>;
  onUpgradePassword: (newHash: string) => Promise<void>;
}

export function PasswordLock({
  storedHash,
  storedQuestion,
  storedAnswerHash,
  onUnlock,
  onEmergencyReset,
  onUpgradePassword,
}: PasswordLockProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"unlock" | "recovery" | "reset-pass">("unlock");

  // Recovery state
  const [answer, setAnswer] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const isMatch = await verifyPassword(password, storedHash);
    if (isMatch) {
      if (!storedHash.startsWith("v2$")) {
        const upgradedHash = await hashPassword(password);
        await onUpgradePassword(upgradedHash);
      }
      onUnlock();
    } else {
      setError("Incorrect password. Please try again.");
      setPassword("");
    }
  };

  const handleRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!storedAnswerHash) {
      setError("No security answer is configured.");
      return;
    }

    const isMatch = await verifySecurityAnswer(answer, storedAnswerHash);
    if (isMatch) {
      setMode("reset-pass");
      setAnswer("");
    } else {
      setError("Incorrect security answer. Please try again.");
      setAnswer("");
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 4) {
      setError("Password must be at least 4 characters long.");
      return;
    }

    if (newPassword !== newPasswordConfirm) {
      setError("Passwords do not match.");
      return;
    }

    const hashed = await hashPassword(newPassword);
    await onUpgradePassword(hashed);
    setMode("unlock");
    setNewPassword("");
    setNewPasswordConfirm("");
    setError("Password reset successfully. Alhamdulillah!");
  };

  const handleEmergencyResetClick = async () => {
    const confirmReset = window.confirm(
      "Bismillah - Emergency Reset\n\n" +
        "This will remove ALL password and security questions, returning the extension to an unlocked state.\n\n" +
        "Your blocking settings will remain intact.\n\n" +
        "This action cannot be undone. Continue?"
    );

    if (confirmReset) {
      const challengePhrase = window.prompt(
        "Final Confirmation Required\n\n" +
          "Please type 'RESET-AMNSHIELD' (without quotes) to proceed with emergency reset:"
      );

      if (challengePhrase === "RESET-AMNSHIELD") {
        await onEmergencyReset();
        window.location.reload();
      } else {
        alert("Confirmation failed. Emergency reset cancelled.");
      }
    }
  };

  const QUESTIONS: Record<string, string> = {
    mother: "What is your mother's maiden name?",
    birthplace: "What city were you born in?",
    school: "What was the name of your first school?",
    pet: "What was your first pet's name?",
    book: "What is your favorite Islamic book?",
    masjid: "What is the name of your local masjid?",
    teacher: "Who was your favorite teacher?",
  };

  return (
    <div className="relative flex min-h-[500px] w-full flex-col items-center justify-center bg-bg px-6 py-12">
      <div className="bloom" aria-hidden="true" />
      <div className="card w-full max-w-sm p-6 relative">
        {mode === "unlock" && (
          <form onSubmit={handleUnlock} className="flex flex-col gap-5 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-surface-2 text-2xl">
              🛡️
            </div>
            <div>
              <h2 className="font-display text-2xl leading-none">AmniShield Active</h2>
              <p className="mt-2 text-xs text-muted">Enter password to manage blocking configurations.</p>
            </div>

            {error && <p className="text-xs font-medium text-accent">{error}</p>}

            <input
              type="password"
              placeholder="Password..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputCls}
              required
            />

            <button type="submit" className={btnPrimary}>
              Unlock Settings
            </button>

            {storedQuestion && storedAnswerHash && (
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setMode("recovery");
                }}
                className="text-xs text-muted hover:text-ink transition-colors"
              >
                Forgot password?
              </button>
            )}
          </form>
        )}

        {mode === "recovery" && (
          <form onSubmit={handleRecovery} className="flex flex-col gap-5">
            <div className="text-center">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-surface-2 text-2xl">
                🔑
              </div>
              <h2 className="font-display text-2xl leading-none mt-4">Password Recovery</h2>
              <p className="mt-2 text-xs text-muted">Answer your security question below to reset password.</p>
            </div>

            {error && <p className="text-xs font-medium text-accent text-center">{error}</p>}

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-ink">
                {storedQuestion ? QUESTIONS[storedQuestion] || storedQuestion : "Security Question"}
              </span>
              <input
                type="text"
                placeholder="Your answer..."
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                className={inputCls}
                required
              />
            </div>

            <div className="flex flex-col gap-2.5 mt-2">
              <button type="submit" className={btnPrimary}>
                Verify Answer
              </button>
              <button
                type="button"
                onClick={() => {
                  setError("");
                  setMode("unlock");
                }}
                className={btnOutline}
              >
                ← Back to Login
              </button>
            </div>

            <div className="mt-4 border-t border-line/60 pt-4 text-center">
              <p className="text-[11px] text-faint mb-2">Can't remember the answer?</p>
              <button
                type="button"
                onClick={handleEmergencyResetClick}
                className="text-xs font-semibold text-accent hover:underline"
              >
                🚨 Emergency Reset
              </button>
            </div>
          </form>
        )}

        {mode === "reset-pass" && (
          <form onSubmit={handleResetPassword} className="flex flex-col gap-5">
            <div className="text-center">
              <h2 className="font-display text-2xl leading-none">Set New Password</h2>
              <p className="mt-2 text-xs text-muted">Set a memorable password for settings protection.</p>
            </div>

            {error && <p className="text-xs font-medium text-accent text-center">{error}</p>}

            <input
              type="password"
              placeholder="New password (min 4 chars)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={inputCls}
              required
            />

            <input
              type="password"
              placeholder="Confirm new password"
              value={newPasswordConfirm}
              onChange={(e) => setNewPasswordConfirm(e.target.value)}
              className={inputCls}
              required
            />

            <button type="submit" className={btnPrimary}>
              Reset & Save Password
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

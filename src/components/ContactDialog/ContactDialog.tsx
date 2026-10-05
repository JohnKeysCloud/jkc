"use client";

import {
  type FormEvent,
  type MouseEvent,
  useId,
  useRef,
  useState,
} from "react";
import { haptic } from "@/lib/haptics";
import styles from "./ContactDialog.module.scss";

/** Must match the form declared in `public/__forms.html`. */
const FORM_NAME = "contact";
const FORM_ENDPOINT = "/__forms.html";
const HONEYPOT_FIELD = "bot-field";

type Status = "idle" | "sending" | "sent" | "error";

export function ContactDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const titleId = useId();

  const openDialog = () => {
    haptic();
    dialogRef.current?.showModal();
    nameRef.current?.focus();
  };

  const closeDialog = () => dialogRef.current?.close();

  const handleClose = () => {
    setStatus((current) => (current === "sending" ? current : "idle"));
  };

  const handleBackdropClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) {
      closeDialog();
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = [...new FormData(form)].map(
      ([key, value]) => [key, String(value)] as [string, string],
    );

    haptic("press");
    setStatus("sending");

    try {
      const response = await fetch(FORM_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(fields).toString(),
      });
      if (!response.ok) {
        throw new Error(`Form submission failed with ${response.status}`);
      }
      form.reset();
      setStatus("sent");
      haptic("success");
    } catch {
      setStatus("error");
      haptic("error");
    }
  };

  return (
    <>
      <button type="button" className={styles.trigger} onClick={openDialog}>
        Send a message
      </button>
      <dialog
        ref={dialogRef}
        className={styles.dialog}
        aria-labelledby={titleId}
        onClick={handleBackdropClick}
        onClose={handleClose}
      >
        <div className={styles.box}>
          <div className={styles.header}>
            <h2 id={titleId} className={styles.title}>
              New message
            </h2>
            <button
              type="button"
              className={styles.close}
              aria-label="Close"
              onClick={closeDialog}
            >
              ✕
            </button>
          </div>

          {status === "sent" ? (
            <div className={styles.sent} role="status">
              <p className={styles.sentTitle}>Message sent!</p>
              <p className={styles.sentBody}>
                Thanks for reaching out. I&apos;ll get back to you soon.
              </p>
              <button
                type="button"
                className={styles.submit}
                onClick={closeDialog}
                autoFocus
              >
                Continue
              </button>
            </div>
          ) : (
            <form
              name={FORM_NAME}
              className={styles.form}
              onSubmit={handleSubmit}
            >
              <input type="hidden" name="form-name" value={FORM_NAME} />
              <div className="srOnly" aria-hidden="true">
                <label>
                  Leave this empty
                  <input
                    name={HONEYPOT_FIELD}
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </label>
              </div>

              <label className={styles.field}>
                <span className={styles.label}>Name</span>
                <input
                  ref={nameRef}
                  className={styles.input}
                  name="name"
                  type="text"
                  autoComplete="name"
                  maxLength={100}
                  required
                />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Email</span>
                <input
                  className={styles.input}
                  name="email"
                  type="email"
                  autoComplete="email"
                  maxLength={254}
                  required
                />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Message</span>
                <textarea
                  className={`${styles.input} ${styles.multiline}`}
                  name="message"
                  rows={5}
                  maxLength={2000}
                  required
                />
              </label>

              <p className={styles.feedback} aria-live="polite">
                {status === "error"
                  ? "Couldn't send your message. Please try again in a moment."
                  : null}
              </p>

              <button
                type="submit"
                className={styles.submit}
                disabled={status === "sending"}
              >
                {status === "sending" ? "Sending..." : "Send"}
              </button>
            </form>
          )}
        </div>
      </dialog>
    </>
  );
}

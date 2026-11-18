"use client";

import { startTransition, useActionState, type FormEvent } from "react";

import { initialActionState, type ActionState } from "@/lib/action-state";

/**
 * useActionState without React 19's automatic form reset. With
 * `<form action={…}>` React resets the form after every action, so a failed
 * validation wipes what the user typed (and controlled checkboxes drift out of
 * sync with their state). Submitting through onSubmit keeps the inputs.
 */
export function useFormAction(action: (prev: ActionState, data: FormData) => Promise<ActionState>) {
  const [state, dispatch, pending] = useActionState(action, initialActionState);
  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => dispatch(data));
  }
  return { state, pending, onSubmit };
}

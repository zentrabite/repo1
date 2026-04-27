"use client";
import { useState } from "react";

export function useToast() {
  const [toast, setToast] = useState({ message: "", visible: false });

  const show = (message: string) => {
    setToast({ message, visible: true });
    setTimeout(() => setToast({ message: "", visible: false }), 2400);
  };

  return { toast, show };
}

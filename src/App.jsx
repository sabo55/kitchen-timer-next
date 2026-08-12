// src/App.jsx
import React from "react";
import Board from "@/components/board/Board";

export default function App() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <Board />
    </div>
  );
}

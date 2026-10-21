import React from "react";

interface Props {
  name: string;
  selected: boolean;
  onSelect: () => void;
}

export default function CameraTile({ name, selected, onSelect }: Props) {
  return (
    <button
      className={`tile ${selected ? "selected" : ""}`}
      onClick={onSelect}
      tabIndex={0}
    >
      <span className="tile-name">{name}</span>
      <span className="tile-status">●</span>
    </button>
  );
}

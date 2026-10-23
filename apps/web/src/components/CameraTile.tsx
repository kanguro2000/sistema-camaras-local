import React from "react";

interface Props {
  index: number;
  name: string;
  selected: boolean;
  onSelect: () => void;
}

export default function CameraTile({ index, name, selected, onSelect }: Props) {
  return (
    <button
      className={`tile ${selected ? "selected" : ""}`}
      onClick={onSelect}
      data-camera-index={index}
      tabIndex={0}
    >
      <span className="tile-name">{name}</span>
      <span className="tile-status">●</span>
    </button>
  );
}

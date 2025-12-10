import React, { memo } from 'react';
import { Handle, Position, NodeResizer } from 'reactflow';
import { Note } from '../types';

interface NoteNodeProps {
  data: Note & { 
    onChange: (content: string) => void;
    onColorChange: (color: string) => void;
    onDelete: () => void;
  };
  selected: boolean;
}

const COLORS = [
  '#fef3c7', // Amber (Post-it yellow)
  '#dcfce7', // Emerald
  '#dbeafe', // Blue
  '#f3e8ff', // Purple
  '#fee2e2', // Red
  '#1e293b', // Dark Slate
];

const NoteNode: React.FC<NoteNodeProps> = ({ data, selected }) => {
  return (
    <div 
      className={`rounded-lg shadow-lg flex flex-col transition-all duration-200 group h-full ${selected ? 'ring-2 ring-primary ring-offset-2 ring-offset-slate-950' : ''}`}
      style={{ backgroundColor: data.color || '#fef3c7', minWidth: 200, minHeight: 150 }}
    >
      <NodeResizer minWidth={200} minHeight={150} isVisible={selected} lineClassName="border-primary" handleClassName="h-3 w-3 bg-white border-2 border-primary rounded" />
      
      {/* Handles (Invisible but often useful if we want to query connection) */}
      <Handle type="target" position={Position.Top} className="opacity-0" />
      
      {/* Header / Toolbar */}
      <div className="h-8 flex justify-between items-center px-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/5 rounded-t-lg">
         <div className="flex gap-1">
            {COLORS.map(c => (
                <button
                    key={c}
                    onClick={() => data.onColorChange(c)}
                    className={`w-3 h-3 rounded-full border border-black/10 hover:scale-125 transition-transform ${data.color === c ? 'ring-1 ring-offset-1 ring-black/30' : ''}`}
                    style={{ backgroundColor: c }}
                />
            ))}
         </div>
         <button 
            onClick={data.onDelete}
            className="text-black/40 hover:text-red-500 font-bold px-1"
         >
            ×
         </button>
      </div>

      <textarea
        className="flex-1 w-full bg-transparent resize-none border-none focus:outline-none p-3 pt-1 text-sm font-medium leading-relaxed"
        style={{ color: (data.color === '#1e293b') ? '#e2e8f0' : '#1e293b' }}
        placeholder="Add a note..."
        value={data.content}
        onChange={(e) => data.onChange(e.target.value)}
        onKeyDown={(e) => {
            // Prevent deleting the node when pressing Backspace in the text area
            e.stopPropagation();
        }}
        onMouseDown={(e) => e.stopPropagation()} // Allow selecting text
        onDragStart={(e) => e.preventDefault()} // Prevent node drag start when selecting text
      />
      
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
    </div>
  );
};

export default memo(NoteNode);

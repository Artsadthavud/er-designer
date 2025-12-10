import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { Table, Column } from '../types';
import { sanitizeId } from '../utils/idUtils';
import { Key, Link, Fingerprint, ShieldAlert, Info, Hash, MessageSquareText } from 'lucide-react';

interface TableNodeProps {
  data: Table & { setTooltip?: (data: any) => void };
}

const TableNode: React.FC<TableNodeProps> = ({ data }) => {
  return (
    <div className="bg-surfaceLight border border-border rounded-lg shadow-2xl min-w-[300px] group hover:border-primary transition-all duration-300">
      {/* Header */}
      <div 
        className="bg-gradient-to-r from-slate-900 to-slate-800 px-4 py-3 border-b border-border flex justify-between items-center relative z-10 rounded-t-lg"
        onMouseEnter={(e) => {
            if (data.description && data.setTooltip) {
                data.setTooltip({
                    x: e.clientX,
                    y: e.clientY,
                    content: (
                        <div className="max-w-xs">
                            <div className="text-xs font-bold text-slate-200 mb-1 flex items-center gap-1">
                                <Info size={12} /> Description
                            </div>
                            <div className="text-xs text-slate-400 italic">
                                {data.description}
                            </div>
                        </div>
                    )
                });
            }
        }}
        onMouseLeave={() => data.setTooltip && data.setTooltip(null)}
      >
        <div className="flex items-center gap-2">
            <div className="bg-primary/20 p-1.5 rounded-md text-primary">
                <Hash size={14} strokeWidth={2.5} />
            </div>
            <h3 className="font-bold text-slate-100 text-sm tracking-wide">
            {data.name}
            </h3>
        </div>
        {data.description && <Info size={14} className="text-slate-500" />}
      </div>
      
      {/* Columns Container */}
      <div className="p-0 bg-surface/50 divide-y divide-border/30 rounded-b-lg">
        {/* Header Row */}
        <div className="flex items-center px-4 py-2 bg-slate-900/50 border-b border-border/30">
             <div className="w-6 text-[10px] font-bold text-slate-500 uppercase">Key</div>
             <div className="flex-1 text-[10px] font-bold text-slate-500 uppercase">Column</div>
             <div className="text-[10px] font-bold text-slate-500 uppercase text-right">Type</div>
        </div>

        {data.columns.map((col: Column, idx: number) => {
            const hasTooltip = col.isForeignKey || col.comment;
            
            return (
            <div 
                key={idx} 
                className={`relative group/row hover:bg-slate-800/50 transition-colors ${hasTooltip ? 'cursor-help' : ''} last:rounded-b-lg`}
                onMouseEnter={(e) => {
                    if (hasTooltip && data.setTooltip) {
                        data.setTooltip({
                            x: e.clientX,
                            y: e.clientY,
                            content: (
                                <div className="space-y-2 min-w-[180px]">
                                    {col.isForeignKey && (
                                        <div className="space-y-1">
                                            <div className="text-xs font-bold text-primary flex items-center gap-2">
                                                <Link size={12} /> Foreign Key
                                            </div>
                                            <div className="text-xs text-slate-300">
                                                <span className="text-slate-500">To:</span> {col.references}
                                            </div>
                                             <div className="text-xs text-slate-400 flex justify-between items-center border-t border-slate-700/50 pt-1 mt-1">
                                                <span className="font-mono text-[10px] bg-slate-800 px-1 rounded">{col.relationType || '1:N'}</span>
                                                <span className="italic text-slate-500 truncate text-[10px]">{col.relationLabel}</span>
                                            </div>
                                        </div>
                                    )}
                                    {col.isForeignKey && col.comment && <div className="h-px bg-slate-700/50" />}
                                    {col.comment && (
                                        <div className="space-y-1">
                                            <div className="text-xs font-bold text-blue-300 flex items-center gap-2">
                                                <MessageSquareText size={12} /> Comment
                                            </div>
                                            <div className="text-xs text-slate-400 italic leading-relaxed">
                                                "{col.comment}"
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        });
                    }
                }}
                onMouseLeave={() => data.setTooltip && data.setTooltip(null)}
            >
                {/* 
                    Handles Logic:
                    We place handles on BOTH sides (Left/Right) for BOTH types (Source/Target).
                    This allows the Edge generator to pick the optimal path (e.g. Right -> Right for vertical stacks).
                    They are invisible (opacity 0) but functional.
                */}

                {/* Left Side Handles */}
                <Handle 
                    type="target" 
                    position={Position.Left} 
                    id={`target-left-${sanitizeId(col.name)}`}
                    className="!w-1 !h-1 !bg-slate-400 !border-none opacity-0 group-hover/row:opacity-100 transition-opacity"
                    style={{ left: -1, top: '50%' }} 
                />
                 <Handle 
                    type="source" 
                    position={Position.Left} 
                    id={`source-left-${sanitizeId(col.name)}`}
                    className="!w-1 !h-1 !bg-primary !border-none opacity-0 group-hover/row:opacity-100 transition-opacity"
                    style={{ left: -1, top: '50%' }} 
                />

                <div className="flex items-center px-4 py-2.5">
                    {/* Key Status */}
                    <div className="w-6 flex items-center justify-start flex-shrink-0">
                         {col.isPrimaryKey && <Key size={12} className="text-warning fill-warning/20" title="Primary Key" />}
                         {col.isForeignKey && <Link size={12} className="text-primary" title={`FK: ${col.references}`} />}
                    </div>

                    {/* Column Name & Icons */}
                    <div className="flex-1 flex items-center gap-2 min-w-0 pr-2">
                        <span className={`text-sm font-medium truncate ${col.isPrimaryKey ? 'text-white' : 'text-slate-300'}`}>
                            {col.name}
                        </span>
                        
                        {/* Constraint Badges */}
                        <div className="flex items-center gap-1 opacity-60 group-hover/row:opacity-100 transition-opacity flex-shrink-0">
                            {col.isUnique && <Fingerprint size={10} className="text-accent" title="Unique" />}
                            {!col.nullable && !col.isPrimaryKey && (
                                <span className="text-[9px] font-bold text-red-400 border border-red-400/30 px-0.5 rounded" title="Not Null">NN</span>
                            )}
                            {col.checkConstraint && <ShieldAlert size={10} className="text-success" title="Check Constraint" />}
                            {col.comment && <MessageSquareText size={10} className="text-blue-300" title="Has Comment" />}
                        </div>
                    </div>

                    {/* Type */}
                    <div className="text-right flex-shrink-0">
                         <span className="text-xs font-mono text-secondary group-hover/row:text-slate-400 transition-colors">
                            {col.type}
                        </span>
                    </div>
                </div>

                {/* Right Side Handles */}
                <Handle 
                    type="source" 
                    position={Position.Right} 
                    id={`source-right-${sanitizeId(col.name)}`}
                    className="!w-1 !h-1 !bg-primary !border-none opacity-0 group-hover/row:opacity-100 transition-opacity"
                    style={{ right: -1, top: '50%' }} 
                />
                <Handle 
                    type="target" 
                    position={Position.Right} 
                    id={`target-right-${sanitizeId(col.name)}`}
                    className="!w-1 !h-1 !bg-slate-400 !border-none opacity-0 group-hover/row:opacity-100 transition-opacity"
                    style={{ right: -1, top: '50%' }} 
                />
            </div>
        )})}
        
        {data.columns.length === 0 && (
             <div className="p-4 text-center text-xs text-slate-600 italic">
                No columns defined
             </div>
        )}
      </div>
    </div>
  );
};

export default memo(TableNode);
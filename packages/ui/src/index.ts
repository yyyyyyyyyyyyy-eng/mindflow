// ============================================================================
// mindflow-ui 包出口（契约 §7）。
// ============================================================================

export { MindMapCanvas } from './canvas/MindMapCanvas';
export type { MindMapCanvasProps } from './canvas/MindMapCanvas';
export { MindNode } from './canvas/MindNode';
export { StringEdge } from './canvas/StringEdge';
export { OutlineView } from './outline/OutlineView';
export type { OutlineViewProps } from './outline/OutlineView';
export { Inspector } from './inspector/Inspector';
export type { InspectorProps } from './inspector/Inspector';
export { ThemeGallery } from './themes/ThemeGallery';
export type { ThemeGalleryProps } from './themes/ThemeGallery';
export { createBrowserMeasureText, MIND_FONT_FAMILY } from './measure';
export { DEFAULT_APPEARANCE, mergeAppearance } from './appearance';
export type { AppearanceConfig, CardStyle, PinStyle, CardButtonStyle, RopeStyle, RopeLayer, BackgroundStyle } from './appearance';
export { CORKBOARD_APPEARANCE, CORKBOARD_NODE_COLORS } from './appearanceCorkboard';
export { thumbnailModel } from './thumb/DocThumbnailModel';
export type { ThumbModel, ThumbNode } from './thumb/DocThumbnailModel';
export { DocThumbnail } from './thumb/DocThumbnail';
export type { DocThumbnailProps } from './thumb/DocThumbnail';
export { applyPosOffsets, colorByLevel, anchorFor, pinOf } from './flowModel';
export { buildFlowGraph, indexTree } from './flowModel';
export type { MindFlowNode, MindFlowEdge, MindNodeData, MindBranchData } from './flowModel';
export { collectOutlineRows, findNode, inSubtree } from './treeOps';
export type { NodeLoc, OutlineRow } from './treeOps';

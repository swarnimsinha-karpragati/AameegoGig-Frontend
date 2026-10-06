import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import { TableKit } from "@tiptap/extension-table";
import Image from "@tiptap/extension-image";
import PlaceholderChip from "../placeholderChipExtension";
import { LayoutBlock, LayoutLine, LetterClassAttribute, LetterSpan } from "./layoutExtensions";
import { ConditionalBlock, ConditionalMark } from "./conditionalExtensions";

/** The single extension list the letter editor uses; round-trip tests load exactly this. */
export const createLetterEditorExtensions = () => [
  StarterKit.configure({ heading: { levels: [2, 3, 4] }, codeBlock: false, code: false, link: false }),
  TextAlign.configure({ types: ["heading", "paragraph"] }),
  TableKit.configure({ table: { resizable: false } }),
  Image.configure({ allowBase64: true }),
  PlaceholderChip,
  LayoutBlock,
  LayoutLine,
  LetterSpan,
  LetterClassAttribute,
  ConditionalMark,
  ConditionalBlock,
];

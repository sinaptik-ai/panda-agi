/* eslint-disable @typescript-eslint/no-explicit-any */
import { Extension } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";
import { ReactRenderer } from "@tiptap/react";
import tippy, { Instance } from "tippy.js";
import SlashCommandMenu, { SlashCommandMenuRef, createSlashCommandItems } from "./slash-command-menu";

export const SlashCommand = Extension.create({
  name: "slashCommand",

  addOptions() {
    return {
      suggestion: {
        char: "/",
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});

export const renderItems = () => {
  let component: ReactRenderer<SlashCommandMenuRef> | null = null;
  let popup: Instance[] | null = null;

  return {
    onStart: (props: any) => {
      const { editor } = props;
      const items = createSlashCommandItems(editor);

      component = new ReactRenderer(SlashCommandMenu, {
        props: {
          ...props,
          items: items.filter((item) =>
            item.title
              .toLowerCase()
              .startsWith(props.query.toLowerCase()) ||
            item.searchTerms.some((term) =>
              term.toLowerCase().includes(props.query.toLowerCase())
            )
          ),
          command: (item: any) => {
            item.command({ editor: props.editor, range: props.range });
          },
        },
        editor: props.editor,
      });

      if (!props.clientRect) {
        return;
      }

      popup = tippy("body", {
        getReferenceClientRect: props.clientRect,
        appendTo: () => document.body,
        content: component.element,
        showOnCreate: true,
        interactive: true,
        trigger: "manual",
        placement: "bottom-start",
      });
    },

    onUpdate(props: any) {
      const { editor } = props;
      const items = createSlashCommandItems(editor);

      if (component) {
        component.updateProps({
          ...props,
          items: items.filter((item) =>
            item.title
              .toLowerCase()
              .startsWith(props.query.toLowerCase()) ||
            item.searchTerms.some((term) =>
              term.toLowerCase().includes(props.query.toLowerCase())
            )
          ),
          command: (item: any) => {
            item.command({ editor: props.editor, range: props.range });
          },
        });
      }

      if (!props.clientRect) {
        return;
      }

      if (popup && popup[0]) {
        popup[0].setProps({
          getReferenceClientRect: props.clientRect,
        });
      }
    },

    onKeyDown(props: any) {
      if (props.event.key === "Escape") {
        if (popup && popup[0]) {
          popup[0].hide();
        }
        return true;
      }

      if (component?.ref?.onKeyDown) {
        return component.ref.onKeyDown(props);
      }

      return false;
    },

    onExit() {
      if (popup && popup[0]) {
        popup[0].destroy();
      }
      popup = null;

      if (component) {
        component.destroy();
      }
      component = null;
    },
  };
};

export const slashCommandSuggestion = {
  items: ({ query, editor }: { query: string; editor: any }) => {
    const items = createSlashCommandItems(editor);
    return items.filter((item) =>
      item.title.toLowerCase().startsWith(query.toLowerCase()) ||
      item.searchTerms.some((term) =>
        term.toLowerCase().includes(query.toLowerCase())
      )
    ).slice(0, 10);
  },
  render: renderItems,
};
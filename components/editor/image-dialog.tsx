"use client";

import {
  closeImageDialog$,
  imageDialogState$,
  saveImage$,
  useCellValues,
  usePublisher,
} from "@mdxeditor/editor";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CustomImageDialog() {
  const [state] = useCellValues(imageDialogState$);
  const closeDialog = usePublisher(closeImageDialog$);
  const saveImage = usePublisher(saveImage$);

  const [src, setSrc] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [alt, setAlt] = useState("");
  const [title, setTitle] = useState("");

  useEffect(() => {
    if (state?.type === "editing") {
      setSrc(state.initialValues.src || "");
      setAlt(state.initialValues.altText || "");
      setTitle(state.initialValues.title || "");
      setFile(null);
    } else if (state?.type === "new") {
      setSrc("");
      setAlt("");
      setTitle("");
      setFile(null);
    }
  }, [state]);

  const isOpen = state?.type === "new" || state?.type === "editing";

  const handleSave = () => {
    if (file) {
      // If a file is selected, pass the file list to the upload handler
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      saveImage({ file: dataTransfer.files, altText: alt, title });
    } else if (src) {
      // If a URL is provided
      saveImage({ src, altText: alt, title });
    }
    closeDialog();
  };

  const handleCancel = () => {
    closeDialog();
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      closeDialog();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-106.25">
        <DialogHeader>
          <DialogTitle>Upload an image</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="image-file">
              Upload an image from your device:
            </Label>
            <Input
              id="image-file"
              type="file"
              accept="image/*"
              className="cursor-pointer"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  setFile(e.target.files[0]);
                  setSrc(""); // Clear src if file is chosen
                }
              }}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="image-url">Or add an image from an URL:</Label>
            <Input
              id="image-url"
              value={file ? "" : src}
              disabled={!!file}
              onChange={(e) => setSrc(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="image-alt">Alt:</Label>
            <Input
              id="image-alt"
              value={alt}
              onChange={(e) => setAlt(e.target.value)}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="image-title">Title:</Label>
            <Input
              id="image-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="secondary" onClick={handleCancel}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

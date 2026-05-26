import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { didatticaApi } from "../api.ts";
import type { FolderDidattica, ElementoDidattica } from "../types.ts";
import { ChevronLeft, FolderOpen, FileText } from "lucide-react";

function FolderList({
  folders,
  onSelect,
}: {
  folders: FolderDidattica[];
  onSelect: (f: FolderDidattica) => void;
}) {
  if (folders.length === 0)
    return <p className="text-gray-500 text-sm">Nessuna cartella disponibile.</p>;

  return (
    <div className="space-y-2">
      {folders.map((f) => (
        <button
          key={f.folderId}
          onClick={() => onSelect(f)}
          className="w-full bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3 hover:border-indigo-200 transition-colors text-left"
        >
          <FolderOpen size={18} className="text-indigo-500 shrink-0" />
          <span className="text-sm font-medium text-gray-800">{f.folderName}</span>
        </button>
      ))}
    </div>
  );
}

function ElementList({ elements }: { elements: ElementoDidattica[] }) {
  if (elements.length === 0)
    return <p className="text-gray-500 text-sm">Cartella vuota.</p>;

  return (
    <div className="space-y-2">
      {elements.map((e) => (
        <div
          key={e.contentId}
          className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3"
        >
          <FileText size={18} className="text-gray-400 shrink-0" />
          <div>
            <p className="text-sm font-medium text-gray-800">{e.contentName}</p>
            <p className="text-xs text-gray-400">{e.objectType}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Didattica() {
  const [selectedFolder, setSelectedFolder] = useState<FolderDidattica | null>(null);

  const { data: foldersData, isLoading: foldersLoading } = useQuery({
    queryKey: ["didattica"],
    queryFn: didatticaApi.get,
  });

  const { data: elementiData, isLoading: elementiLoading } = useQuery({
    queryKey: ["didattica", selectedFolder?.folderId],
    queryFn: () => didatticaApi.getFolder(selectedFolder!.folderId),
    enabled: selectedFolder !== null,
  });

  const folders = foldersData?.didacticts ?? [];
  const elements = elementiData?.didacticts ?? [];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        {selectedFolder && (
          <button
            onClick={() => setSelectedFolder(null)}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
        )}
        <h1 className="text-2xl font-bold text-gray-900">
          {selectedFolder ? selectedFolder.folderName : "Didattica"}
        </h1>
      </div>

      {(foldersLoading || elementiLoading) && <Spinner />}

      {!selectedFolder && !foldersLoading && (
        <FolderList folders={folders} onSelect={setSelectedFolder} />
      )}

      {selectedFolder && !elementiLoading && (
        <ElementList elements={elements} />
      )}
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
    </div>
  );
}

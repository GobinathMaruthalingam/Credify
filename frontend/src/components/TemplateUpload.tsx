import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileImage, UploadCloud, Loader2 } from 'lucide-react';
import axios from 'axios';

interface TemplateUploadProps {
    onUpload: (fileUrl: string, fileName: string) => void;
}

export default function TemplateUpload({ onUpload }: TemplateUploadProps) {
    const [isUploading, setIsUploading] = useState(false);

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            const file = acceptedFiles[0];
            setIsUploading(true);
            try {
                const token = localStorage.getItem("token") || "mock_token";
                const formData = new FormData();
                formData.append("file", file);

                const res = await axios.post("http://localhost:8000/api/projects/upload", formData, {
                    headers: {
                        "Content-Type": "multipart/form-data",
                        Authorization: `Bearer ${token}`
                    }
                });

                const baseName = file.name.split('.').slice(0, -1).join('.') || file.name;
                onUpload(res.data.url, baseName);
            } catch (err) {
                console.error("Upload failed", err);
                alert("Failed to upload template to the cloud storage bucket.");
            } finally {
                setIsUploading(false);
            }
        }
    }, [onUpload]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/*': ['.png', '.jpg', '.jpeg'] },
        maxFiles: 1
    });

    return (
        <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300
        ${isDragActive ? 'border-indigo-500 bg-indigo-50/50' : 'border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-slate-400'}`}
        >
            <input {...getInputProps()} />
            <div className="flex justify-center mb-4">
                <div className={`p-4 rounded-full transition-colors ${isDragActive ? 'bg-indigo-100 text-indigo-600' : 'bg-white text-slate-400 shadow-sm'}`}>
                    {isUploading ? <Loader2 size={40} className="animate-spin text-indigo-500" /> : isDragActive ? <UploadCloud size={40} /> : <FileImage size={40} />}
                </div>
            </div>
            <h3 className="text-xl font-semibold text-slate-800 mb-2">
                {isUploading ? "Uploading to secure cloud..." : isDragActive ? "Drop template here..." : "Upload your Certificate Template"}
            </h3>
            <p className="text-slate-500 max-w-sm mx-auto">
                Drag and drop a PNG or JPG file here, or click to browse your computer.
            </p>
        </div>
    );
}

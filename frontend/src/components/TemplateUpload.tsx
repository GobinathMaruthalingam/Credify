import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileImage, UploadCloud } from 'lucide-react';

interface TemplateUploadProps {
    onUpload: (fileUrl: string) => void;
}

export default function TemplateUpload({ onUpload }: TemplateUploadProps) {
    const onDrop = useCallback((acceptedFiles: File[]) => {
        // In a real app, we would upload this file to our FastAPI backend S3 endpoint here.
        // For this mock interaction, we'll just create a local blob URL so we can render it on the canvas immediately.
        if (acceptedFiles.length > 0) {
            const file = acceptedFiles[0];
            const objectUrl = URL.createObjectURL(file);
            onUpload(objectUrl);
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
                    {isDragActive ? <UploadCloud size={40} /> : <FileImage size={40} />}
                </div>
            </div>
            <h3 className="text-xl font-semibold text-slate-800 mb-2">
                {isDragActive ? "Drop template here..." : "Upload your Certificate Template"}
            </h3>
            <p className="text-slate-500 max-w-sm mx-auto">
                Drag and drop a PNG or JPG file here, or click to browse your computer.
            </p>
        </div>
    );
}

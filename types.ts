export type Language = 'en' | 'zh';

export interface Translations {
  title: string;
  subtitle: string;
  dropText: string;
  dropSubText: string;
  browse: string;
  processing: string;
  success: string;
  download: string;
  reset: string;
  errorGeneric: string;
  errorType: string;
  footer: string;
  fileName: string;
  imageSize: string;
}

export const DICTIONARY: Record<Language, Translations> = {
  en: {
    title: "LastFrame",
    subtitle: "Extract the perfect ending from your videos.",
    dropText: "Drag & drop video here",
    dropSubText: "or click to browse",
    browse: "Browse Files",
    processing: "Extracting last frame...",
    success: "Frame Extracted Successfully",
    download: "Download PNG",
    reset: "Convert Another",
    errorGeneric: "Failed to process video. Please try another file.",
    errorType: "Invalid file type. Please upload a video file.",
    footer: "100% Client-side processing. Your files never leave your device.",
    fileName: "File Name",
    imageSize: "Resolution",
  },
  zh: {
    title: "LastFrame",
    subtitle: "一键提取视频最后一帧。",
    dropText: "拖放视频文件到这里",
    dropSubText: "或点击浏览",
    browse: "选择文件",
    processing: "正在提取最后一帧...",
    success: "提取成功",
    download: "下载 PNG",
    reset: "处理新视频",
    errorGeneric: "处理视频失败，请尝试其他文件。",
    errorType: "文件格式错误，请上传视频文件。",
    footer: "100% 本地处理，您的文件不会上传到云端。",
    fileName: "文件名",
    imageSize: "分辨率",
  }
};
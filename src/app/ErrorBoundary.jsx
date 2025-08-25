// src/app/ErrorBoundary.jsx
import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    // ส่ง log เพิ่มได้ตามต้องการ
    console.error("Runtime error:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="m-4 p-4 border-2 border-red-500 rounded-xl bg-red-50 text-red-800">
          <div className="font-semibold mb-1">Something went wrong.</div>
          <div className="text-xs whitespace-pre-wrap">
            {String(this.state.error)}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

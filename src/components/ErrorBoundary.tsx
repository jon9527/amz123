import { Component, ErrorInfo, ReactNode } from 'react';
import { Logger } from '../services/Logger';
import { Button } from './ui';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
        Logger.error('SYSTEM', 'Uncaught Application Error', {
            error: error.message,
            stack: errorInfo.componentStack
        });
    }

    private handleReload = () => {
        window.location.reload();
    };

    private handleClearData = () => {
        if (confirm('此操作将清除所有本地数据（不仅是重置状态）。是否确认？')) {
            localStorage.clear();
            window.location.reload();
        }
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
                    <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-2xl">
                        <div className="flex items-center gap-3 mb-4 text-red-500">
                            <span className="material-symbols-outlined text-4xl">error_outline</span>
                            <h1 className="text-xl font-bold">系统遇到问题</h1>
                        </div>

                        <p className="text-zinc-400 mb-6">
                            很抱歉，程序发生了意外错误。我们已经记录了这个问题。
                        </p>

                        {this.state.error && (
                            <div className="bg-black/50 rounded-lg p-3 mb-6 font-mono text-xs text-red-400 overflow-auto max-h-32">
                                {this.state.error.message}
                            </div>
                        )}

                        <div className="flex flex-col gap-3">
                            <Button onClick={this.handleReload} variant="primary" className="w-full justify-center">
                                重新加载页面
                            </Button>
                            <Button onClick={this.handleClearData} variant="ghost" className="w-full justify-center text-zinc-500 hover:text-red-400">
                                清除数据并重置 (紧急恢复)
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

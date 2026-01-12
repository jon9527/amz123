import React, { useEffect, useCallback } from 'react';

export interface ModalProps {
    /** 是否显示 */
    isOpen: boolean;
    /** 关闭回调 */
    onClose: () => void;
    /** 标题 */
    title?: string;
    /** 内容 */
    children: React.ReactNode;
    /** 宽度 */
    width?: string;
    /** 是否显示关闭按钮 */
    showCloseButton?: boolean;
    /** 点击遮罩是否关闭 */
    closeOnOverlayClick?: boolean;
    /** 按ESC是否关闭 */
    closeOnEsc?: boolean;
}

/**
 * 通用模态框组件
 */
const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    title,
    children,
    width = '480px',
    showCloseButton = true,
    closeOnOverlayClick = true,
    closeOnEsc = true,
}) => {
    // ESC 键关闭
    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (e.key === 'Escape' && closeOnEsc) {
                onClose();
            }
        },
        [onClose, closeOnEsc]
    );

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            // 防止背景滚动
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = '';
        };
    }, [isOpen, handleKeyDown]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-in fade-in duration-200"
            onClick={closeOnOverlayClick ? onClose : undefined}
        >
            <div
                className="bg-[#18181b] border border-[#27272a] rounded-2xl max-h-[90vh] overflow-auto animate-in zoom-in-95 duration-200"
                style={{ width }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* 标题栏 */}
                {(title || showCloseButton) && (
                    <div className="flex items-center justify-between p-6 pb-4 border-b border-[#27272a]">
                        {title && <h2 className="text-xl font-bold text-white">{title}</h2>}
                        {showCloseButton && (
                            <button
                                onClick={onClose}
                                className="w-8 h-8 rounded-lg bg-zinc-700 hover:bg-zinc-600 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                            >
                                ✕
                            </button>
                        )}
                    </div>
                )}
                {/* 内容区 */}
                <div className={title || showCloseButton ? 'p-6 pt-4' : 'p-6'}>{children}</div>
            </div>
        </div>
    );
};

export default Modal;

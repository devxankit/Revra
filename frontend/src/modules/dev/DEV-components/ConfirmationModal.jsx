import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { AlertTriangle } from 'lucide-react';

const ConfirmationModal = ({
    isOpen,
    onClose,
    onConfirm,
    title = "Confirm Action",
    message = "Are you sure you want to proceed?",
    description = "A deleted task cannot be revert.",
    confirmText = "Confirm",
    cancelText = "Cancel",
    variant = "destructive", // "destructive" for deletion, "default" for others
    isLoading = false
}) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent onClose={onClose} className="max-w-[92%] sm:max-w-[360px] p-0 overflow-hidden border-none shadow-2xl rounded-2xl">
                <div className="bg-white p-5 sm:p-6 text-center">
                    <DialogHeader className="space-y-3">
                        {variant === "destructive" && (
                            <div className="mx-auto w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mb-1">
                                <AlertTriangle className="h-6 w-6 text-red-500" />
                            </div>
                        )}
                        <DialogTitle className="text-lg sm:text-xl font-bold text-gray-900 leading-tight">
                            {title}
                        </DialogTitle>
                        <div className="space-y-1">
                            <h4 className="text-sm sm:text-base font-medium text-gray-700">
                                {message}
                            </h4>
                            <DialogDescription className="text-xs sm:text-sm text-gray-500 font-normal">
                                {description}
                            </DialogDescription>
                        </div>
                    </DialogHeader>

                    <div className="mt-6 flex flex-col sm:flex-row gap-2 sm:gap-3">
                        <Button
                            variant="outline"
                            onClick={onClose}
                            disabled={isLoading}
                            className="w-full sm:flex-1 h-10 sm:h-11 rounded-xl font-semibold text-gray-600 border-gray-200 hover:bg-gray-50 order-2 sm:order-1"
                        >
                            {cancelText}
                        </Button>
                        <Button
                            variant={variant}
                            onClick={onConfirm}
                            disabled={isLoading}
                            className="w-full sm:flex-1 h-10 sm:h-11 rounded-xl font-semibold shadow-sm order-1 sm:order-2"
                        >
                            {isLoading ? "Deleting..." : confirmText}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default ConfirmationModal;

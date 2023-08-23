export function create(context) {
    return {
        AssignmentExpression(node) {
            if (node.left.type === 'MemberExpression' &&
                node.left.object.callee &&
                node.left.object.callee.object &&
                node.left.object.callee.object.name === 'config' &&
                node.left.object.callee.property &&
                node.left.object.callee.property.name === 'get') {
                context.report({
                    node: node,
                    message: 'Do not mutate the result of config.get() directly.'
                });
            }
        }
    };
}
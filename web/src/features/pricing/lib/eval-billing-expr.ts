/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/

type ExprValue = number | string | boolean

type ExprNode =
  | { kind: 'num'; value: number }
  | { kind: 'str'; value: string }
  | { kind: 'bool'; value: boolean }
  | { kind: 'ident'; name: string }
  | { kind: 'unary'; op: '!' | '+' | '-'; arg: ExprNode }
  | { kind: 'binary'; op: string; left: ExprNode; right: ExprNode }
  | { kind: 'ternary'; cond: ExprNode; whenTrue: ExprNode; whenFalse: ExprNode }
  | { kind: 'call'; name: string; args: ExprNode[] }

/**
 * CSP-safe billing-expression evaluator.
 * Parses the estimator subset (arithmetic, comparisons, ternaries, tier/math
 * calls) without eval() or new Function(), which browsers reject when
 * script-src does not include 'unsafe-eval'.
 */
export function evaluateBillingExpr(
  exprStr: string,
  vars: Record<string, number>,
  onTier?: (name: string, value: number) => void
): number {
  const body = stripExprVersion(exprStr)
  const parser = new BillingExprParser(body)
  const ast = parser.parse()
  return toNumber(evalNode(ast, vars, onTier))
}

function stripExprVersion(exprStr: string): string {
  const match = exprStr.match(/^v\d+:([\s\S]*)$/)
  return match ? match[1] : exprStr
}

class BillingExprParser {
  private i = 0

  constructor(private readonly src: string) {}

  parse(): ExprNode {
    this.skip()
    if (this.i >= this.src.length) {
      throw new Error('Empty expression')
    }
    const node = this.parseTernary()
    this.skip()
    if (this.i < this.src.length) {
      throw new Error(`Unexpected token "${this.peek()}"`)
    }
    return node
  }

  private parseTernary(): ExprNode {
    const cond = this.parseOr()
    this.skip()
    if (!this.eat('?')) return cond
    const whenTrue = this.parseTernary()
    this.skip()
    if (!this.eat(':')) {
      throw new Error('Expected ":" in ternary expression')
    }
    return {
      kind: 'ternary',
      cond,
      whenTrue,
      whenFalse: this.parseTernary(),
    }
  }

  private parseOr(): ExprNode {
    let left = this.parseAnd()
    for (;;) {
      this.skip()
      if (!this.eat('||')) return left
      left = { kind: 'binary', op: '||', left, right: this.parseAnd() }
    }
  }

  private parseAnd(): ExprNode {
    let left = this.parseEquality()
    for (;;) {
      this.skip()
      if (!this.eat('&&')) return left
      left = { kind: 'binary', op: '&&', left, right: this.parseEquality() }
    }
  }

  private parseEquality(): ExprNode {
    let left = this.parseComparison()
    for (;;) {
      this.skip()
      const op = this.eatOp('===', '!==', '==', '!=')
      if (!op) return left
      left = { kind: 'binary', op, left, right: this.parseComparison() }
    }
  }

  private parseComparison(): ExprNode {
    let left = this.parseAdd()
    for (;;) {
      this.skip()
      const op = this.eatOp('<=', '>=', '<', '>')
      if (!op) return left
      left = { kind: 'binary', op, left, right: this.parseAdd() }
    }
  }

  private parseAdd(): ExprNode {
    let left = this.parseMul()
    for (;;) {
      this.skip()
      const op = this.eatOp('+', '-')
      if (!op) return left
      left = { kind: 'binary', op, left, right: this.parseMul() }
    }
  }

  private parseMul(): ExprNode {
    let left = this.parseUnary()
    for (;;) {
      this.skip()
      const op = this.eatOp('*', '/', '%')
      if (!op) return left
      left = { kind: 'binary', op, left, right: this.parseUnary() }
    }
  }

  private parseUnary(): ExprNode {
    this.skip()
    if (this.eat('!')) return { kind: 'unary', op: '!', arg: this.parseUnary() }
    if (this.eat('+')) return { kind: 'unary', op: '+', arg: this.parseUnary() }
    if (this.eat('-')) return { kind: 'unary', op: '-', arg: this.parseUnary() }
    return this.parsePrimary()
  }

  private parsePrimary(): ExprNode {
    this.skip()
    if (this.eat('(')) {
      const node = this.parseTernary()
      this.skip()
      if (!this.eat(')')) throw new Error('Expected ")"')
      return node
    }
    const ch = this.peek()
    if (ch === '"' || ch === "'") {
      return { kind: 'str', value: this.parseString() }
    }
    if (isNumberStart(ch, this.peek(1))) {
      return { kind: 'num', value: this.parseNumber() }
    }
    if (isIdentStart(ch)) {
      const name = this.parseIdent()
      this.skip()
      if (this.peek() === '(') return this.parseCall(name)
      if (name === 'true') return { kind: 'bool', value: true }
      if (name === 'false') return { kind: 'bool', value: false }
      return { kind: 'ident', name }
    }
    if (ch === '') throw new Error('Unexpected end of expression')
    throw new Error(`Unexpected token "${ch}"`)
  }

  private parseCall(name: string): ExprNode {
    if (!this.eat('(')) throw new Error('Expected "("')
    const args: ExprNode[] = []
    this.skip()
    if (this.peek() !== ')') {
      args.push(this.parseTernary())
      this.skip()
      while (this.eat(',')) {
        args.push(this.parseTernary())
        this.skip()
      }
    }
    if (!this.eat(')')) throw new Error('Expected ")" after function arguments')
    return { kind: 'call', name, args }
  }

  private parseIdent(): string {
    const start = this.i
    this.i++
    while (isIdentPart(this.peek())) this.i++
    return this.src.slice(start, this.i)
  }

  private parseString(): string {
    const quote = this.peek()
    this.i++
    let out = ''
    while (this.i < this.src.length) {
      const ch = this.peek()
      if (ch === quote) {
        this.i++
        return out
      }
      if (ch === '\\') {
        this.i++
        const escaped = this.peek()
        if (escaped === '') throw new Error('Unterminated string')
        out += escaped
        this.i++
        continue
      }
      if (ch === '\n') throw new Error('Unterminated string')
      out += ch
      this.i++
    }
    throw new Error('Unterminated string')
  }

  private parseNumber(): number {
    const start = this.i
    if (this.peek() === '.') {
      this.i++
      if (!isDigit(this.peek())) throw new Error('Invalid number')
      while (isDigit(this.peek())) this.i++
    } else {
      while (isDigit(this.peek())) this.i++
      if (this.peek() === '.' && isDigit(this.peek(1))) {
        this.i++
        while (isDigit(this.peek())) this.i++
      }
    }
    if (this.peek() === 'e' || this.peek() === 'E') {
      this.i++
      if (this.peek() === '+' || this.peek() === '-') this.i++
      if (!isDigit(this.peek())) throw new Error('Invalid number')
      while (isDigit(this.peek())) this.i++
    }
    const n = Number(this.src.slice(start, this.i))
    if (Number.isNaN(n)) throw new Error('Invalid number')
    return n
  }

  private eatOp(...tokens: string[]): string | null {
    for (const token of tokens) {
      if (this.eat(token)) return token
    }
    return null
  }

  private eat(token: string): boolean {
    if (!this.src.startsWith(token, this.i)) return false
    const next = this.src[this.i + token.length] ?? ''
    if (token === '!' && next === '=') return false
    if (token === '<' && next === '=') return false
    if (token === '>' && next === '=') return false
    if (token === '=' && next === '=') return false
    this.i += token.length
    return true
  }

  private skip(): void {
    while (this.i < this.src.length) {
      const ch = this.src[this.i]
      if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
        this.i++
        continue
      }
      break
    }
  }

  private peek(offset = 0): string {
    return this.src[this.i + offset] ?? ''
  }
}

function evalNode(
  node: ExprNode,
  vars: Record<string, number>,
  onTier?: (name: string, value: number) => void
): ExprValue {
  switch (node.kind) {
    case 'num':
      return node.value
    case 'str':
      return node.value
    case 'bool':
      return node.value
    case 'ident':
      if (Object.hasOwn(vars, node.name)) {
        return vars[node.name]
      }
      throw new Error(`Unknown identifier: ${node.name}`)
    case 'unary': {
      const arg = evalNode(node.arg, vars, onTier)
      if (node.op === '!') return !isTruthy(arg)
      if (node.op === '+') return toNumber(arg)
      return -toNumber(arg)
    }
    case 'binary':
      return evalBinary(node.op, node.left, node.right, vars, onTier)
    case 'ternary':
      return isTruthy(evalNode(node.cond, vars, onTier))
        ? evalNode(node.whenTrue, vars, onTier)
        : evalNode(node.whenFalse, vars, onTier)
    case 'call':
      return evalCall(
        node.name,
        node.args.map((arg) => evalNode(arg, vars, onTier)),
        onTier
      )
  }
}

function evalBinary(
  op: string,
  leftNode: ExprNode,
  rightNode: ExprNode,
  vars: Record<string, number>,
  onTier?: (name: string, value: number) => void
): ExprValue {
  const left = evalNode(leftNode, vars, onTier)
  if (op === '&&')
    return isTruthy(left) ? evalNode(rightNode, vars, onTier) : left
  if (op === '||')
    return isTruthy(left) ? left : evalNode(rightNode, vars, onTier)
  const right = evalNode(rightNode, vars, onTier)
  switch (op) {
    case '===':
      return Object.is(left, right)
    case '!==':
      return !Object.is(left, right)
    case '==':
      return looseEquals(left, right)
    case '!=':
      return !looseEquals(left, right)
    case '<=':
      return toNumber(left) <= toNumber(right)
    case '>=':
      return toNumber(left) >= toNumber(right)
    case '<':
      return toNumber(left) < toNumber(right)
    case '>':
      return toNumber(left) > toNumber(right)
    case '+':
      return toNumber(left) + toNumber(right)
    case '-':
      return toNumber(left) - toNumber(right)
    case '*':
      return toNumber(left) * toNumber(right)
    case '/':
      return toNumber(left) / toNumber(right)
    case '%':
      return toNumber(left) % toNumber(right)
    default:
      throw new Error(`Unknown operator: ${op}`)
  }
}

function evalCall(
  name: string,
  args: ExprValue[],
  onTier?: (name: string, value: number) => void
): ExprValue {
  switch (name) {
    case 'tier': {
      if (args.length !== 2) {
        throw new Error('tier() expects 2 arguments')
      }
      const label = String(args[0])
      const value = toNumber(args[1])
      onTier?.(label, value)
      return value
    }
    case 'max':
      if (args.length === 0)
        throw new Error('max() expects at least 1 argument')
      return Math.max(...args.map(toNumber))
    case 'min':
      if (args.length === 0)
        throw new Error('min() expects at least 1 argument')
      return Math.min(...args.map(toNumber))
    case 'abs':
      if (args.length !== 1) throw new Error('abs() expects 1 argument')
      return Math.abs(toNumber(args[0]))
    case 'ceil':
      if (args.length !== 1) throw new Error('ceil() expects 1 argument')
      return Math.ceil(toNumber(args[0]))
    case 'floor':
      if (args.length !== 1) throw new Error('floor() expects 1 argument')
      return Math.floor(toNumber(args[0]))
    default:
      throw new Error(`Unknown function: ${name}`)
  }
}

function isTruthy(value: ExprValue): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0 && !Number.isNaN(value)
  return value !== ''
}

function toNumber(value: ExprValue): number {
  if (typeof value === 'number') return value
  if (typeof value === 'boolean') return value ? 1 : 0
  const n = Number(value)
  if (Number.isNaN(n)) {
    throw new Error(`Cannot convert "${value}" to a number`)
  }
  return n
}

function looseEquals(left: ExprValue, right: ExprValue): boolean {
  if (typeof left === typeof right) return left === right
  return toNumber(left) === toNumber(right)
}

function isDigit(ch: string): boolean {
  return ch >= '0' && ch <= '9'
}

function isIdentStart(ch: string): boolean {
  return (ch >= 'A' && ch <= 'Z') || (ch >= 'a' && ch <= 'z') || ch === '_'
}

function isIdentPart(ch: string): boolean {
  return isIdentStart(ch) || isDigit(ch)
}

function isNumberStart(ch: string, next: string): boolean {
  return isDigit(ch) || (ch === '.' && isDigit(next))
}

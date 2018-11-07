const path = require('path');
const HtmlWebPackPlugin = require('html-webpack-plugin');

module.exports = {
	entry: './demo/index.ts',
	mode: 'development',
	devServer: {
		contentBase: './dist'
	},
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				loader: 'ts-loader',
				exclude: /node_modules/
			},
			{
				test: /\.html$/,
				loader: 'html-loader',
				options: {
					interpolate: true,
				}
			}
		]
	},
	plugins: [
		new HtmlWebPackPlugin({
			template: './demo/index.html'
		})
	],
	resolve: {
		extensions: ['.tsx', '.ts', '.js']
	},
	output: {
		filename: 'bundle.js',
		path: path.resolve(__dirname, 'dist')
	}
}
